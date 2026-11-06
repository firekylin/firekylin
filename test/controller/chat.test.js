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
  const {instance, user: setUser} = controller(t);
  const config = {handle, path: ':memory:', database: 'chat-controller-flow', prefix: 'test_', logConnect: false, debounce: false};
  const model = createModels(config);
  t.after(() => model('chat/session').db().query.socket().close());
  await require('../../src/service/migration/050-chat').migrate({model: model('chat/session'), config: {type: 'sqlite', sqlite: config}});
  const store = model('chat/session');
  const originalModel = instance.model;
  instance.model = name => name === 'chat/session' ? store : originalModel(name);
  const registry = new Registry();
  let writes = 0, turn = 0;
  const image = await require('sharp')({create: {width: 2, height: 2, channels: 3, background: '#f00'}}).png().toBuffer();
  const imageFile = {kind: 'image', name: 'red.png', mimeType: 'image/png', data: image.toString('base64')};
  registry.register({name: 'demo.write', description: 'Write', expose: {'admin-chat': true},
    requiredPermissions: [], execute: async() => {writes++; return {saved: true}}}, 'test');
  global.firekylin.plugins = {abilities: registry, ai: {
    models: async() => [{id: 'demo', models: [{id: 'demo', selected: true, capabilities: ['text', 'tools', 'vision']}]}],
    generate: async(request, context) => {
      assert.equal(context.recordContent, false);
      const attached = request.messages.find(message => message.role === 'user');
      assert.match(attached.content, /文件中的实际内容/);
      assert.equal(attached.attachments, undefined);
      assert.equal(attached.images[0].mimeType, 'image/png');
      assert.ok(Buffer.from(attached.images[0].data, 'base64').equals(image));
      assert.ok(!attached.content.includes(attached.images[0].data));
      return turn++ ? {text: '已完成'} : {toolCalls: [{id: 'call', name: 'demo.write', input: {}}]};
    }
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
  instance.post = () => ({session: session.id, operation: 'send', content: '', attachments: [{name: 'test.md', content: '文件中的实际内容'}, imageFile], requestKey: 'first'});
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
  const restored = (await instance.getAction()).data.messages;
  assert.equal(restored.at(-1).content, '已完成');
  assert.deepEqual(restored[0].attachments[0], {name: 'test.md', content: '文件中的实际内容', size: 24});
  assert.equal(restored[0].attachments[1].data, image.toString('base64'));
  assert.equal(restored[0].attachments[1].width, 2);
  instance.post = () => ({session: session.id, operation: 'send', content: 'hello', attachments: [{name: 'a.pdf', content: 'no'}]});
  assert.match((await instance.postAction()).errmsg, /仅支持/);
  assert.equal((await store.model('chat/message').listForSession(session.id)).length, restored.length);
  setUser({id: 99, type: 2, status: 1});
  instance.userInfo = {id: 99, type: 2};
  await assert.rejects(instance.getAction(), /无权/);
  await assert.rejects(instance.postAction(), /无权/);
  await store.remove(session.id);
  assert.equal((await store.model('chat/message').listForSession(session.id)).length, 0);
});
test('image-only send survives a failed provider, refresh and retry; text-only models cannot discard it', async t => {
  const {instance} = controller(t);
  const config = {handle: require('think-model-sqlite'), path: ':memory:', database: 'chat-image-retry', prefix: 'test_', debounce: false};
  const model = require('../helpers/chat-model')(config);
  const store = model('chat/session');
  t.after(() => store.db().query.socket().close());
  await require('../../src/service/migration/050-chat').migrate({model: store, config: {type: 'sqlite', sqlite: config}});
  const original = instance.model;
  instance.model = name => name === 'chat/session' ? store : original(name);
  const png = await require('sharp')({create: {width: 2, height: 2, channels: 3, background: '#f00'}}).png().toBuffer();
  const image = {kind: 'image', name: 'red.png', mimeType: 'image/png', data: png.toString('base64')};
  let calls = 0;
  global.firekylin.plugins = {abilities: new (require('../../src/ability/registry'))(), ai: {
    models: async() => [{id: 'demo', models: [{id: 'vision', capabilities: ['text', 'vision']}, {id: 'plain', capabilities: ['text']}]}],
    generate: async request => {
      calls++;
      assert.equal(request.messages.find(message => message.role === 'user').images[0].data, image.data);
      if (calls === 1) throw new Error('provider failed');
      return {text: '红色图片'};
    }
  }};
  const session = await store.create({id: 2}, {provider: 'demo', model: 'plain'});
  instance.post = () => ({operation: 'send', session: session.id, content: '', attachments: [image], requestKey: 'first'});
  assert.match((await instance.postAction()).errmsg, /不支持图片/);
  assert.equal((await store.model('chat/message').listForSession(session.id)).length, 0);
  await store.updateSession(session.id, {model: 'vision'});
  const {EventEmitter} = require('node:events');
  const stream = () => {
    const res = new EventEmitter();
    res.writeHead = () => {}; res.write = () => {}; res.end = () => {res.writableEnded = true};
    instance.ctx.res = res;
  };
  stream(); await instance.postAction();
  instance.get = () => session.id;
  const restored = (await instance.getAction()).data;
  assert.equal(restored.messages[0].attachments[0].data, image.data);
  assert.equal(restored.messages.at(-1).role, 'error');
  stream();
  instance.post = () => ({operation: 'retry', session: session.id, requestKey: 'retry'});
  await instance.postAction();
  const messages = (await instance.getAction()).data.messages;
  assert.equal(messages.filter(message => message.role === 'user').length, 1);
  assert.equal(messages.at(-1).content, '红色图片');
  assert.equal(calls, 2);
  instance.post = () => ({operation: 'select', session: session.id, provider: 'demo', model: 'plain'});
  await assert.rejects(instance.postAction(), /不支持图片/);
  assert.equal((await store.session(session.id, {id: 2})).model, 'vision');
  await store.remove(session.id);
  assert.deepEqual(await store.model('chat/message').listForSession(session.id), []);
});
