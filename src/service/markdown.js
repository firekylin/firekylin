'use strict';

const MarkdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const hljs = require('highlight.js');
const {filter} = require('../plugin/runtime');

let builtinPlugins;
let sharedMathjaxInstance;

async function loadBuiltinPlugins() {
  if (!builtinPlugins) {
    builtinPlugins = Promise.all([
      import('@mdit/plugin-alert'),
      import('@mdit/plugin-footnote'),
      import('@mdit/plugin-mathjax'),
      import('@mdit/plugin-tasklist')
    ]).then(([alertModule, footnoteModule, mathjaxModule, tasklistModule]) => ({
      alert: alertModule.alert,
      footnote: footnoteModule.footnote,
      createMathjaxInstance: mathjaxModule.createMathjaxInstance,
      mathjax: mathjaxModule.mathjax,
      tasklist: tasklistModule.tasklist
    }));
  }
  return builtinPlugins;
}

function createMathjax(builtins) {
  return builtins.createMathjaxInstance({
    output: 'svg',
    mathFence: true,
    transformer(content, display) {
      const type = display ? 'block' : 'inline';
      return `<span class="firekylin-markdown-mathjax-${type}">${content}</span>`;
    }
  });
}

function resolveMathjax(builtins) {
  if (!sharedMathjaxInstance) sharedMathjaxInstance = createMathjax(builtins);
  return sharedMathjaxInstance;
}

function imageOnlyPlugin(md) {
  const original = md.renderer.rules.paragraph_open ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
    const inline = tokens[idx + 1];
    const children = inline && inline.type === 'inline' ? inline.children || [] : [];
    const imageOnly = children.some(token => token.type === 'image') && children.every(token =>
      token.type === 'image' || ['softbreak', 'hardbreak'].includes(token.type) ||
      (token.type === 'text' && !token.content.trim())
    );
    if (imageOnly) tokens[idx].attrJoin('class', 'firekylin-markdown-img-only');
    return original(tokens, idx, options, env, self);
  };
}

function legacyInlineMathPlugin(md) {
  md.core.ruler.after('inline', 'firekylin_legacy_inline_math', state => {
    for (const token of state.tokens) {
      for (const child of token.children || []) {
        if (child.type !== 'code_inline' || child.content.length < 3 ||
          !child.content.startsWith('$') || !child.content.endsWith('$')) continue;
        child.type = 'math_inline';
        child.tag = 'math';
        child.markup = '$';
        child.content = child.content.slice(1, -1);
      }
    }
  });
}

function codePlugin(md) {
  const originalFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim().split(/\s+/)[0] === 'mermaid') return `<pre class="mermaid">${token.content}</pre>`;
    return originalFence(tokens, idx, options, env, self);
  };
}

function applyConfiguredPlugins(md, plugins) {
  for (const entry of Array.isArray(plugins) ? plugins : []) {
    if (typeof entry === 'function') md.use(entry);
    else if (Array.isArray(entry) && typeof entry[0] === 'function') md.use(entry[0], entry[1]);
    else if (entry && typeof entry.plugin === 'function') md.use(entry.plugin, entry.options);
  }
}

function configuredMarkdown() {
  if (typeof think === 'undefined' || typeof think.config !== 'function') return {};
  return think.config('markdown') || {};
}

async function createMarkdownParser(renderOptions = {}) {
  const configured = configuredMarkdown();
  const builtins = await loadBuiltinPlugins();
  const markdownOptions = {
    html: true,
    linkify: true,
    ...(configured.options || {}),
    ...(renderOptions.markdownIt || {})
  };
  const md = new MarkdownIt({
    ...markdownOptions,
    highlight: renderOptions.highlight === false ? undefined : (code, lang) => {
      const language = lang && hljs.getLanguage(lang) ? lang : undefined;
      const result = language ? hljs.highlight(code, {language}) : hljs.highlightAuto(code);
      const className = result.language ? ` class="hljs lang-${md.utils.escapeHtml(result.language)}"` : ' class="hljs"';
      return `<pre><code${className}>${result.value}</code></pre>`;
    }
  });

  if (renderOptions.footnote !== false) md.use(builtins.footnote);
  if (renderOptions.alert !== false) md.use(builtins.alert);
  if (renderOptions.math !== false) {
    const mathjaxInstance = await resolveMathjax(builtins);
    if (mathjaxInstance) {
      md.use(builtins.mathjax, mathjaxInstance);
      md.use(legacyInlineMathPlugin);
    }
  }
  if (renderOptions.tasklist !== false) md.use(builtins.tasklist);
  if (renderOptions.imageOnly !== false) md.use(imageOnlyPlugin);
  if (renderOptions.code !== false) md.use(codePlugin);

  const tocEntries = [];
  if (renderOptions.toc) {
    md.use(markdownItAnchor, {
      slugify: renderOptions.slugify,
      tabIndex: false,
      permalink(slug, anchorOptions, state, idx) {
        const heading = state.tokens[idx];
        const inline = state.tokens[idx + 1];
        const content = md.renderer.renderInline(inline.children, md.options, state.env);
        tocEntries.push({id: slug, content, level: Number(heading.tag.slice(1))});

        const idIndex = heading.attrIndex('id');
        if (idIndex >= 0) heading.attrs.splice(idIndex, 1);
        const open = new state.Token('link_open', 'a', 1);
        open.attrs = [['id', slug], ['class', 'anchor'], ['href', `#${slug}`]];
        inline.children.unshift(open, new state.Token('link_close', 'a', -1));
      }
    });
  }

  applyConfiguredPlugins(md, configured.plugins);
  const parser = await filter('markdown.configure', md, {options: renderOptions, config: configured});
  return {md: parser || md, tocEntries};
}

async function renderMarkdown(content, options = {}) {
  const {md, tocEntries} = await createMarkdownParser(options);
  const env = options.env || {};
  let html = md.render(String(content || ''), env);
  if (options.toc && tocEntries.length && typeof options.renderToc === 'function') {
    html = `${options.renderToc(tocEntries)}${html}`;
  }
  return html;
}

module.exports = {createMarkdownParser, renderMarkdown};
