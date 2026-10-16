'use strict';

const MarkdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const markdownItFootnote = require('markdown-it-footnote');
const hljs = require('highlight.js');
const MathJax = require('mathjax');
const {filter} = require('../plugin/runtime');

const mathJaxReady = MathJax.init({
  loader: {load: ['input/tex', 'output/svg']},
  svg: {fontCache: 'none'}
});

const ALERT_NAMES = new Set(['note', 'tip', 'important', 'warning', 'caution']);

function alertPlugin(md) {
  md.core.ruler.after('block', 'firekylin_alert', state => {
    for (let i = 0; i < state.tokens.length - 2; i++) {
      const open = state.tokens[i];
      const inline = state.tokens[i + 2];
      if (open.type !== 'blockquote_open' || inline.type !== 'inline') continue;
      const match = inline.content.match(/^\[!([A-Z]+)\](?:\n|$)/);
      const name = match && match[1].toLowerCase();
      if (!ALERT_NAMES.has(name)) continue;
      open.attrJoin('class', `markdown-alert markdown-alert-${name}`);
      inline.content = inline.content.slice(match[0].length);
      if (inline.children && inline.children[0] && inline.children[0].type === 'text') {
        inline.children[0].content = inline.children[0].content.slice(match[0].length);
      }
      const titleOpen = new state.Token('html_block', '', 0);
      titleOpen.content = `<p class="markdown-alert-title">${name[0].toUpperCase()}${name.slice(1)}</p>\n`;
      state.tokens.splice(i + 1, 0, titleOpen);
      i++;
    }
  });
}

function imageOnlyPlugin(md) {
  const original = md.renderer.rules.paragraph_open ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
    const inline = tokens[idx + 1];
    const children = inline && inline.type === 'inline' ? inline.children || [] : [];
    const imageOnly = children.some(token => token.type === 'image') && children.every(token =>
      token.type === 'image' || (token.type === 'text' && !token.content.trim())
    );
    if (imageOnly) tokens[idx].attrJoin('class', 'firekylin-markdown-img-only');
    return original(tokens, idx, options, env, self);
  };
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

async function renderMath(token, formulaType) {
  await mathJaxReady;
  const node = await MathJax.tex2svgPromise(token.content, {display: formulaType === 'block'});
  const svg = MathJax.startup.adaptor.serializeXML(node);
  token.type = formulaType === 'block' ? 'html_block' : 'html_inline';
  token.tag = '';
  token.content = `<span class="firekylin-markdown-mathjax-${formulaType}">${svg}</span>`;
  token.children = null;
}

async function transformMath(tokens) {
  for (const token of tokens) {
    if (token.type === 'fence' && token.info.trim() === 'math') await renderMath(token, 'block');
    else if (token.type === 'code_inline' && token.content.startsWith('$') && token.content.endsWith('$')) {
      token.content = token.content.slice(1, -1);
      await renderMath(token, 'inline');
    }
    if (token.children) await transformMath(token.children);
  }
}

async function createMarkdownParser(renderOptions = {}) {
  const configured = configuredMarkdown();
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

  if (renderOptions.footnote !== false) md.use(markdownItFootnote);
  if (renderOptions.alert !== false) md.use(alertPlugin);
  if (renderOptions.imageOnly !== false) md.use(imageOnlyPlugin);
  if (renderOptions.code !== false) md.use(codePlugin);

  const tocEntries = [];
  if (renderOptions.toc) {
    md.use(markdownItAnchor, {
      slugify: renderOptions.slugify,
      permalink: markdownItAnchor.permalink.linkInsideHeader({
        symbol: '',
        placement: 'before',
        class: 'anchor',
        ariaHidden: false
      }),
      callback(token, info) {
        tocEntries.push({id: info.slug, content: token.content, level: Number(token.tag.slice(1))});
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
  const tokens = md.parse(String(content || ''), env);
  if (options.math !== false) await transformMath(tokens);
  let html = md.renderer.render(tokens, md.options, env);
  if (options.toc && tocEntries.length && typeof options.renderToc === 'function') {
    html = `${options.renderToc(tocEntries)}${html}`;
  }
  return html;
}

module.exports = {createMarkdownParser, renderMarkdown};
