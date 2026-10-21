'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

global.think = {config: () => ({})};
const {renderMarkdown} = require('../../src/service/markdown');

test('markdown-it renderer keeps the built-in Firekylin extensions', async() => {
  const html = await renderMarkdown([
    '# **Hello** `world`',
    '',
    '> [!NOTE]',
    '> message',
    '',
    '![one](one.png)',
    '![two](two.png)',
    '',
    '- [x] done',
    '',
    '```mermaid',
    'graph TD; A-->B',
    '```',
    '',
    'footnote[^1]',
    '',
    '[^1]: detail'
  ].join('\n'), {
    toc: true,
    math: false,
    slugify: value => value.toLowerCase().replace(/\s+/g, '-'),
    renderToc: entries => `<nav>${entries.map(entry => `${entry.id}:${entry.content}`).join(',')}</nav>`
  });

  assert.match(html, /^<nav>hello-world:<strong>Hello<\/strong> <code>world<\/code><\/nav>/);
  assert.match(html, /<h1><a id="hello-world" class="anchor" href="#hello-world"><\/a>/);
  assert.match(html, /class="markdown-alert markdown-alert-note"/);
  assert.match(html, /class="firekylin-markdown-img-only"/);
  assert.match(html, /type="checkbox"[^>]*checked/);
  assert.match(html, /<svg[^>]*class="pele pele-flowchart"/);
  assert.doesNotMatch(html, /<pre class="mermaid">/);
  assert.match(html, /class="footnotes"/);
});

test('mermaid diagrams render safe SVG on the server', async() => {
  const html = await renderMarkdown([
    '```mermaid',
    'flowchart LR',
    '  accTitle: First diagram',
    '  A["<script>alert(1)</script>"] --> B',
    '  click B "javascript:alert(2)"',
    '```',
    '',
    '```mermaid',
    'flowchart LR',
    '  accTitle: Second diagram',
    '  C --> D',
    '```'
  ].join('\n'), {math: false});

  assert.equal((html.match(/<svg/g) || []).length, 2);
  assert.match(html, />alert\(1\)<\/text>/);
  assert.doesNotMatch(html, /<script|javascript:|onload=|onclick=|<foreignObject/i);
  assert.match(html, /id="firekylin-mermaid-0-title"/);
  assert.match(html, /id="firekylin-mermaid-1-title"/);
});

test('invalid mermaid stays visible as escaped source', async() => {
  const html = await renderMarkdown('```mermaid\nnot a diagram <img src=x onerror=alert(1)>\n```', {math: false});

  assert.match(html, /<pre class="mermaid"><code>not a diagram &lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img|<svg/);
});

test('project config and plugins can extend markdown-it', async() => {
  global.think.config = key => key === 'markdown' ? {
    options: {breaks: true},
    plugins: [md => {
      md.renderer.rules.text = (tokens, idx) => tokens[idx].content.toUpperCase();
    }]
  } : {};
  global.firekylin = {plugins: {events: {
    async filter(event, markdown) {
      assert.equal(event, 'markdown.configure');
      markdown.renderer.rules.strong_open = () => '<strong data-plugin="enabled">';
      return markdown;
    }
  }}};

  const html = await renderMarkdown('hello\nworld\n\n**plugin**', {toc: false, math: false});
  assert.match(html, /HELLO<br>\nWORLD/);
  assert.match(html, /<strong data-plugin="enabled">PLUGIN<\/strong>/);
  global.think.config = () => ({});
  delete global.firekylin;
});

test('math and code highlighting retain their server-side output hooks', async() => {
  const html = await renderMarkdown([
    '$x + y$',
    '',
    '`$legacy + formula$`',
    '',
    '```math',
    'x^2',
    '```',
    '',
    '```js',
    'const answer = 42;',
    '```'
  ].join('\n'), {toc: false});

  assert.match(html, /firekylin-markdown-mathjax-inline/);
  assert.doesNotMatch(html, /<code>\$legacy \+ formula\$<\/code>/);
  assert.match(html, /legacy \+ formula/);
  assert.match(html, /firekylin-markdown-mathjax-block/);
  assert.match(html, /class="hljs lang-js"/);
});
