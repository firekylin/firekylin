'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

global.think = {Service: class {}};
const {pathnameFromUrl, renderMarkdown} = require('../../src/service/comment');

test('comment markdown removes unsafe links and image sources', () => {
  const output = renderMarkdown([
    '[unsafe](javascript:alert(1))',
    '[encoded](javascript&#58;alert(1))',
    '![image](data:text/html;base64,PHNjcmlwdD4=)',
    '[safe](https://example.com/path)'
  ].join('\n\n'));

  assert.doesNotMatch(output, /javascript:|data:text\/html/i);
  assert.doesNotMatch(output, /<a href="[^"]*">unsafe<\/a>/);
  assert.match(output, /href="https:\/\/example\.com\/path"/);
});

test('comment markdown escapes raw HTML while preserving safe formatting', () => {
  const output = renderMarkdown('<script>alert(1)</script> **bold** ![pixel](data:image/png;base64,AA==)');
  assert.doesNotMatch(output, /<script>/);
  assert.match(output, /&lt;script&gt;/);
  assert.match(output, /<strong>bold<\/strong>/);
  assert.match(output, /src="data:image\/png;base64,AA=="/);
});

test('comment paths decode browser-encoded post pathnames', () => {
  assert.deepEqual(pathnameFromUrl('/post/%E4%B8%AD%E6%96%87.html'), {type: 0, pathname: '中文'});
  assert.deepEqual(pathnameFromUrl('/page/about.html'), {type: 1, pathname: 'about'});
  assert.equal(pathnameFromUrl('/post/%E4.html'), null);
});
