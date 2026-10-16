'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

global.think = {Service: class {}};
const CommentService = require('../../src/service/comment');
const {pathnameFromUrl, renderMarkdown, resolveCommentPostId} = require('../../src/service/comment');

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

test('comment URL resolution ignores unpublished permalink collisions', async() => {
  const rows = [
    {id: 7, type: 0, pathname: 'same', status: 3, is_public: 1},
    {id: 8, type: 1, pathname: 'same', status: 0, is_public: 1}
  ];
  global.think.isEmpty = value => !value || !Object.keys(value).length;
  const controller = {model: () => {
    let where;
    return {
      where(value) { where = value; return this },
      field() { return this },
      async find() {
        return rows.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) || {};
      }
    };
  }};
  const options = {post_permalink: '/{slug}.html', page_permalink: '/{slug}.html'};
  assert.equal(await resolveCommentPostId(controller, '/same.html', options), 7);
});

test('comment input enforces configured length and anonymous metadata', () => {
  const service = new CommentService();
  const anonymous = {state: {}};
  const signedIn = {state: {userInfo: {objectId: '1'}}};
  const config = {wordLimit: [2, 5], requiredMeta: ['nick', 'mail']};

  assert.throws(() => service.validateCommentInput({comment: 'a', nick: 'A', mail: 'a@example.com'}, anonymous, config),
    error => error.code === 'VALIDATION_ERROR' && error.details.min === 2);
  assert.throws(() => service.validateCommentInput({comment: 'hello', nick: 'A'}, anonymous, config),
    error => error.code === 'VALIDATION_ERROR' && error.details.field === 'mail');
  assert.doesNotThrow(() => service.validateCommentInput({comment: 'hello'}, signedIn, config));
});
