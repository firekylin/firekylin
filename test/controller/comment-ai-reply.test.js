'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const auth = require('../../src/service/admin-auth');
const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/admin/api/comment.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/comment');
} finally { Module._load = load }

test('suggested replies preserve successful responses with real controller helpers', async t => {
  const previous = {think: global.think, firekylin: global.firekylin};
  t.after(() => Object.assign(global, previous));
  global.think = require('../../src/extend/think');
  global.firekylin = {plugins: {ai: {generate: async() => ({text: ' 谢谢你的评论！ '})}}};
  const instance = new Controller();
  instance.userInfo = {id: 1, type: 1};
  const input = {id: 2, operation: 'suggestReply'};
  instance.post = key => input[key];
  instance.model = name => name === 'options'
    ? {getOptions: async() => ({ai_content_features: JSON.stringify({commentReply: true})})}
    : {where() { return this }, async find() {
      return name === 'comment' ? {id: 2, post_id: 3, comment: '好文章'} : {id: 3, title: '文章', markdown_content: '正文'};
    }};
  instance.ctx = {state: {jwtSecret: 'comment-reply-test-secret-at-least-32-bytes'}, cookie: () => '', get: () => auth.csrfToken(instance.ctx)};
  const responses = [];
  instance.ctx.success = data => responses.push({errno: 0, data});
  instance.ctx.fail = errmsg => responses.push({errno: 1, errmsg});
  Object.assign(instance, require('../../src/extend/controller'));
  await assert.rejects(instance.postAction(), {message: 'PREVENT_NEXT_PROCESS'});
  assert.deepEqual(responses, [{errno: 0, data: {text: '谢谢你的评论！'}}]);
  for (const generate of [async() => { throw new Error('provider failed') }, async() => ({text: ''})]) {
    responses.length = 0;
    global.firekylin.plugins.ai.generate = generate;
    await assert.rejects(instance.postAction(), {message: 'PREVENT_NEXT_PROCESS'});
    assert.equal(responses.length, 1);
    assert.equal(responses[0].errno, 1);
  }
});

test('admin replies resolve current permalinks by parent post ID, never historical URLs', async() => {
  const instance = new Controller();
  instance.userInfo = {id: 1, type: 1};
  instance.post = key => ({id: 2, operation: 'reply', comment: '谢谢！'})[key];
  instance.ctx = {state: {jwtSecret: 'comment-reply-test-secret-at-least-32-bytes'},
    cookie: () => '', get: () => auth.csrfToken(instance.ctx)};
  instance.success = () => ({errno: 0});
  instance.fail = errmsg => ({errno: 1, errmsg});
  const parent = {id: 2, post_id: 3, url: '/post/old.html', rid: 1};
  let post = {id: 3, type: 0, pathname: 'renamed', create_time: '2026-10-29 12:00:00'};
  const created = [], synced = [];
  const options = {};
  instance.model = name => ({where(where) {
    assert.deepEqual(where, {id: name === 'comment' ? 2 : 3});
    return this;
  }, find: async() => name === 'comment' ? parent : post});
  instance.service = () => ({
    create: async() => ({options, core: {comment: {create: async input => created.push(input)}}}),
    context: async() => ({}), syncCount: async(_controller, id) => synced.push(id)
  });
  // Renaming a slug, including reusing its old value for another post, must not
  // make the historical URL determine the article receiving the reply.
  assert.equal((await instance.postAction()).errno, 0);
  assert.deepEqual(created[0], {url: '/post/renamed.html', pid: '2', rid: '1', comment: '谢谢！'});
  options.post_permalink = '/articles/{id}/{slug}';
  assert.equal((await instance.postAction()).errno, 0);
  assert.equal(created[1].url, '/articles/3/renamed');
  assert.deepEqual(synced, [3, 3]);
  post = {};
  assert.equal((await instance.postAction()).errmsg, '评论所属文章不存在');
  assert.equal(created.length, 2);
});
