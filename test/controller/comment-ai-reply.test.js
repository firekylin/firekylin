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
