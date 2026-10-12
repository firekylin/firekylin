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
  const output = service.render(current, {
    className: 'article-comments invalid<script',
    title: '<评论>',
    resourceURL: 'https://cdn.example.com/waline/3.17.0/dist/'
  });

  assert.match(output, /id="comments" class="fk-comments article-comments"/);
  assert.match(output, /&lt;评论&gt;/);
  assert.match(output, /&quot;serverURL&quot;:&quot;https:\/\/example\.com\/api\/comment&quot;/);
  assert.match(output, /&quot;login&quot;:&quot;force&quot;/);
  assert.match(output, /https:\/\/cdn\.example\.com\/waline\/3\.17\.0\/dist\/waline\.js/);
  assert.match(output, /https:\/\/cdn\.example\.com\/waline\/3\.17\.0\/dist\/waline\.css/);
  assert.match(output, /IntersectionObserver/);
  assert.equal(service.render(current), '');
});

test('comment helper uses a pinned client by default and rejects unsafe resource URLs', () => {
  const service = new CommentRender();
  assert.match(service.render(controller()), /@waline\/client@3\.16\.0\/dist\/waline\.js/);
  assert.throws(
    () => service.render(controller(), {resourceURL: 'javascript:alert(1)'}),
    /resourceURL must be an HTTP\(S\) or root-relative URL/
  );
});

test('comment helper renders nothing when comments are unavailable', () => {
  const service = new CommentRender();
  assert.equal(service.render(controller({archive: {stack: [{allow_comment: 0, status: 3, is_public: 1}]}})), '');
  assert.equal(service.render(controller({get: name => name === 'preview' ? '1' : undefined})), '');
  assert.equal(service.render(controller({archive: null})), '');
});
