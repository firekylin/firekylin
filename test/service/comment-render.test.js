'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const originalThink = global.think;
global.think = {Service: class {}};
const CommentRender = require('../../src/service/comment-render');

test.after(() => {
  if (originalThink === undefined) delete global.think;
  else global.think = originalThink;
});

function controller(overrides = {}) {
  return {
    archive: {stack: [{allow_comment: 1, status: 3, is_public: 1}]},
    options: {
      siteUrl: 'https://example.com',
      comment: {pageSize: 20, locale: 'zh-CN', forceLogin: true}
    },
    get: () => undefined,
    ...overrides
  };
}

test('comment helper renders a self-contained forced-login comment block', () => {
  const service = new CommentRender();
  const current = controller();
  const output = service.render(current, {className: 'article-comments invalid<script', title: '<评论>'});

  assert.match(output, /id="comments" class="fk-comments article-comments"/);
  assert.match(output, /&lt;评论&gt;/);
  assert.match(output, /&quot;serverURL&quot;:&quot;https:\/\/example\.com\/api\/comment&quot;/);
  assert.match(output, /&quot;login&quot;:&quot;force&quot;/);
  assert.match(output, /@waline\/client@3\.16\.0/);
  assert.match(output, /IntersectionObserver/);
  assert.equal(service.render(current), '');
});

test('comment helper renders nothing when comments are unavailable', () => {
  const service = new CommentRender();
  assert.equal(service.render(controller({archive: {stack: [{allow_comment: 0, status: 3, is_public: 1}]}})), '');
  assert.equal(service.render(controller({get: name => name === 'preview' ? '1' : undefined})), '');
  assert.equal(service.render(controller({archive: null})), '');
});
