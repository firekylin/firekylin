'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const auth = require('../../src/service/admin-auth');

const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/admin/api/ai-editor.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/ai-editor');
} finally { Module._load = load }
function setup(t) {
  const previous = global.firekylin;
  t.after(() => { global.firekylin = previous });
  const calls = [];
  const ai = {models: async() => [{configured: true, models: [{selected: true, capabilities: ['text']}]}],
    generate: async request => { calls.push(request); return {text: 'generated'} }};
  global.firekylin = {plugins: {ai}};
  const instance = new Controller();
  const secret = 'ai-editor-test-secret-at-least-32-bytes';
  const cookie = auth.sign({id: 1, name: 'writer', type: 2}, secret);
  instance.ctx = {state: {jwtSecret: secret}, cookie: () => cookie, get: () => auth.csrfToken(instance.ctx),
    throw(status) { throw Object.assign(new Error('denied'), {status}) }};
  instance.success = data => ({errno: 0, data});
  instance.fail = errmsg => ({errno: 1, errmsg});
  return {instance, ai, calls};
}
test('editor requires configured selected text model', async t => {
  const {instance, ai} = setup(t);
  assert.equal(await instance.available(), true);
  ai.models = async() => [{configured: false, models: [{selected: true, capabilities: ['text']}]}];
  assert.equal(await instance.available(), false);
  ai.models = async() => [{models: [{selected: true, capabilities: ['image']}]}];
  assert.equal(await instance.available(), false);
});
test('editor validates every threshold and CSRF before generating', async t => {
  const {instance, calls} = setup(t);
  for (const [operation, minimum] of Object.entries({title: 250, summary: 250, review: 100, translate: 10})) {
    instance.post = () => ({operation, content: '字'.repeat(minimum), language: '英语'});
    assert.equal((await instance.postAction()).errno, 1);
    instance.post = () => ({operation, content: '字'.repeat(minimum + 1), language: '英语'});
    assert.equal((await instance.postAction()).errno, 0);
  }
  assert.equal(calls.length, 4);
  instance.ctx.get = () => '';
  await assert.rejects(instance.postAction(), {status: 403});
});
test('translation translates title only when requested and reports failures', async t => {
  const {instance, ai, calls} = setup(t);
  instance.post = () => ({operation: 'translate', content: 'a'.repeat(11),
    title: 'Title', language: '日语', translateTitle: true});
  assert.deepEqual((await instance.postAction()).data, {text: 'generated', title: 'generated'});
  assert.equal(calls.length, 2);
  ai.generate = async() => { throw new Error('Provider unavailable') };
  assert.equal((await instance.postAction()).errmsg, 'Provider unavailable');
});
test('real response helpers preserve successful AI responses and terminate only once', async t => {
  const {instance, ai} = setup(t);
  const previousThink = global.think;
  t.after(() => { global.think = previousThink });
  global.think = require('../../src/extend/think');
  const helpers = require('../../src/extend/controller');
  instance.success = helpers.success;
  instance.fail = helpers.fail;
  const responses = [];
  instance.ctx.success = data => responses.push({errno: 0, data});
  instance.ctx.fail = errmsg => responses.push({errno: 1, errmsg});
  for (const operation of ['title', 'summary', 'review', 'translate']) {
    responses.length = 0;
    instance.post = () => ({operation, content: '字'.repeat(251), language: '英语'});
    await assert.rejects(instance.postAction(), {message: 'PREVENT_NEXT_PROCESS'});
    assert.deepEqual(responses, [{errno: 0, data: {text: 'generated', title: undefined}}]);
  }
  responses.length = 0;
  instance.post = () => ({operation: 'translate', content: '字'.repeat(251), language: 'invalid'});
  await assert.rejects(instance.postAction(), {message: 'PREVENT_NEXT_PROCESS'});
  assert.deepEqual(responses, [{errno: 1, errmsg: '请选择翻译语种'}]);
  responses.length = 0;
  instance.post = () => ({operation: 'title', content: '字'.repeat(251)});
  ai.generate = async() => { throw new Error('Provider unavailable') };
  await assert.rejects(instance.postAction(), {message: 'PREVENT_NEXT_PROCESS'});
  assert.deepEqual(responses, [{errno: 1, errmsg: 'Provider unavailable'}]);
});
