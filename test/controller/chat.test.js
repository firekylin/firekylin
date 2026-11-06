'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const auth = require('../../src/service/admin-auth');
const original = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/api/chat.js')) return class {};
    return original.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/chat');
} finally { Module._load = original }
function controller(t) {
  const instance = new Controller();
  instance.userInfo = {id: 2, type: 2};
  let user = {id: 2, type: 2, status: 1};
  instance.model = () => ({where: () => ({find: async() => user})});
  instance.ctx = {state: {jwtSecret: 'chat-controller-tests-secret-32-characters'},
    cookie: () => auth.sign(instance.userInfo, 'chat-controller-tests-secret-32-characters'),
    throw: status => {throw Object.assign(new Error('denied'), {status})}};
  instance.ctx.get = () => auth.csrfToken(instance.ctx);
  instance.post = () => ({operation: 'create'});
  instance.success = data => ({errno: 0, data}); instance.fail = errmsg => ({errno: 1, errmsg});
  const previous = global.firekylin;
  global.firekylin = {plugins: {ai: {models: async() => []}}};
  t.after(() => {global.firekylin = previous});
  return {instance, user: value => {user = value}};
}
test('chat rejects commenters, disabled users, stale administrator claims', async t => {
  const {instance, user} = controller(t);
  user({id: 2, type: 4});
  await assert.rejects(instance.identity(), {status: 403});
  user({id: 2, type: 2, status: 2});
  await assert.rejects(instance.identity(), {status: 403});
  user({id: 2, type: 2, status: 1});
  instance.userInfo.type = 1;
  assert.equal((await instance.identity()).type, 2);
});
test('every session operation checks ownership before proceeding', async t => {
  const {instance} = controller(t);
  let checks = 0;
  const originalModel = instance.model;
  instance.model = name => name !== 'chat/session' ? originalModel(name) : ({session: async(id, principal) => {
    assert.equal(principal.id, 2); checks++;
    throw new Error('对话不存在或无权访问');
  }});
  for (const operation of ['send', 'select', 'confirm', 'rename', 'delete', 'stop', 'retry']) {
    instance.post = () => ({operation, session: 'someone-else'});
    await assert.rejects(instance.postAction(), /无权/);
  }
  instance.get = () => 'someone-else';
  await assert.rejects(instance.getAction(), /无权/);
  assert.equal(checks, 8);
});

test('inherited REST writes cannot bypass chat ownership and confirmation', t => {
  const {instance} = controller(t);
  assert.throws(() => instance.putAction(), {status: 405});
  assert.throws(() => instance.deleteAction(), {status: 405});
});
test('controller streams a complete persistent conversation and confirmation with SQLite', async t => {
  const handle = require('think-model-sqlite');
  const createModels = require('../helpers/chat-model');
  const Registry = require('../../src/ability/registry');
  const {EventEmitter} = require('node:events');
  const {instance} = controller(t);
  const config = {handle, path: ':memory:', database: 'chat-controller-flow', prefix: 'test_', logConnect: false, debounce: false};
  const model = createModels(config);
  t.after(() => model('chat/session').db().query.socket().close());
  await require('../../src/service/migration/050-chat').migrate({model: model('chat/session'), config: {type: 'sqlite', sqlite: config}});
  const store = model('chat/session');
  const originalModel = instance.model;
  instance.model = name => name === 'chat/session' ? store : originalModel(name);
  const registry = new Registry();
  let writes = 0, turn = 0;
  registry.register({name: 'demo.write', description: 'Write', expose: {'admin-chat': true},
    requiredPermissions: [], execute: async() => {writes++; return {saved: true}}}, 'test');
  global.firekylin.plugins = {abilities: registry, ai: {
    models: async() => [{id: 'demo', models: [{id: 'demo', selected: true, capabilities: ['text', 'tools']}]}],
    generate: async() => turn++ ? {text: '已完成'} : {toolCalls: [{id: 'call', name: 'demo.write', input: {}}]}
  }};
  const oldThink = global.think;
  global.think = {datetime: () => '2026-11-06 00:00:00'};
  t.after(() => {global.think = oldThink});
  instance.post = () => ({operation: 'create'});
  const session = (await instance.postAction()).data;
  const streamed = [];
  const response = () => {
    const res = new EventEmitter();
    res.writeHead = code => assert.equal(code, 200);
    res.write = value => streamed.push(value);
    res.end = () => {res.writableEnded = true};
    return res;
  };
  instance.ctx.res = response();
  instance.post = () => ({session: session.id, operation: 'send', content: '保存操作', requestKey: 'first'});
  await instance.postAction();
  assert.equal(writes, 0);
  const userFrame = streamed.findIndex(frame => frame.includes('event: message') && frame.includes('\"role\":\"user\"'));
  const statusFrame = streamed.findIndex(frame => frame.includes('event: status'));
  assert.ok(userFrame >= 0 && userFrame < statusFrame, 'user message is streamed before model execution');
  assert.ok(streamed.some(frame => frame.includes('event: done') && frame.includes('waiting')));
  const action = (await store.model('chat/action').listForSession(session.id))[0];
  instance.ctx.res = response();
  instance.post = () => ({session: session.id, operation: 'confirm', action: action.id, approve: true, requestKey: 'confirm'});
  await instance.postAction();
  assert.equal(writes, 1);
  assert.equal((await store.model('chat/message').listForSession(session.id)).at(-1).content, '已完成');
  assert.equal((await store.session(session.id, {id: 2})).active_run, '');
  assert.equal((await store.model('chat/action').listForSession(session.id))[0].status, 'completed');
  instance.get = () => session.id;
  assert.equal((await instance.getAction()).data.messages.at(-1).content, '已完成');
});
