'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

global.think = {config: () => ({})};
const {renderMarkdown} = require('../../src/service/markdown');

test('markdown-it renderer keeps the built-in Firekylin extensions', async() => {
  const html = await renderMarkdown([
    '# Hello world',
    '',
    '> [!NOTE]',
    '> message',
    '',
    '![one](one.png) ![two](two.png)',
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
    renderToc: entries => `<nav>${entries.map(entry => entry.id).join(',')}</nav>`
  });

  assert.match(html, /^<nav>hello-world<\/nav>/);
  assert.match(html, /class="markdown-alert markdown-alert-note"/);
  assert.match(html, /class="firekylin-markdown-img-only"/);
  assert.match(html, /<pre class="mermaid">graph TD; A-->B/);
  assert.match(html, /class="footnotes"/);
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
    '`$x + y$`',
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
  assert.match(html, /firekylin-markdown-mathjax-block/);
  assert.match(html, /class="hljs lang-js"/);
});
