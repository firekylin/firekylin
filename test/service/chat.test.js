'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handle = require('think-model-sqlite');
const {migrate, definition} = require('../../src/service/migration/050-chat');
const createModels = require('../helpers/chat-model');
const {ChatAgent, authorize, validate} = require('../../src/service/chat-agent');
const Registry = require('../../src/ability/registry');
let sequence = 0;
async function setup(t) {
  const config = {handle, path: ':memory:', database: `chat-test-${++sequence}`, prefix: 'test_', logConnect: false, debounce: false};
  const factory = createModels(config);
  const model = factory('chat/session');
  const socket = model.db().query.socket();
  t.after(() => socket.close());
  await migrate({model, config: {type: 'sqlite', sqlite: config}});
  await migrate({model, config: {type: 'sqlite', sqlite: config}});
  const store = factory('chat/session');
  const user = {id: 1, type: 1};
  const session = await store.create(user, {provider: 'test', model: 'model'});
  const registry = new Registry();
  let output = {text: '你好'};
  const ai = {models: async() => [{id: 'test', models: [{id: 'model', capabilities: ['text', 'tools']}]}],
    generate: async() => typeof output === 'function' ? output() : output};
  const agent = new ChatAgent({store, registry, ai, getModel: factory});
  const run = async(decision) => {
    const id = await store.claim(session, require('crypto').randomUUID());
    try {return await agent.run({session, user, run: id, signal: new AbortController().signal, emit() {}, decision})}
    finally {await store.finish(session.id, id, 'completed')}
  };
  return {store, user, session, registry, ai, agent, run, output: value => {output = value}};
}
test('all dialect definitions use bounded identifiers and supported large text types', () => {
  for (const type of ['sqlite', 'mysql', 'tidb', 'postgresql']) {
    const tables = definition({type, [type]: {prefix: 'fk_'}});
    assert.equal(tables.length, 4);
    assert.ok(tables.every(row => row.table.startsWith('fk_chat_')));
    if (type === 'mysql' || type === 'tidb') assert.match(tables[1].columns, /MEDIUMTEXT/);
  }
  assert.throws(() => definition({type: 'sqlite', sqlite: {prefix: 'bad;'}}));
});
test('SQLite storage isolates users, preserves order, locks runs, rejects duplicate keys, and deletes records', async t => {
  const {store, user, session} = await setup(t);
  await assert.rejects(store.session(session.id, {id: 2}), /无权/);
  assert.equal((await store.list({id: 2})).length, 0);
  for (let n = 0; n < 10; n++) await store.model('chat/message').append(session.id, {role: 'user', content: String(n)});
  assert.deepEqual((await store.model('chat/message').listForSession(session.id)).map(row => row.content), Array.from({length: 10}, (_, n) => String(n)));
  const results = await Promise.allSettled([store.claim(session, 'a'), store.claim(session, 'b')]);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
  const run = results.find(row => row.status === 'fulfilled').value;
  await store.finish(session.id, run, 'completed');
  const key = (await store.model('chat/run').where({id: run}).find()).request_key;
  await assert.rejects(store.claim(session, key), /已接收/);
  await store.remove(session.id);
  assert.equal((await store.list(user)).length, 0);
  assert.equal((await store.model('chat/message').listForSession(session.id)).length, 0);
});
test('read tool runs in a multi-turn loop with server identity and structured result', async t => {
  const env = await setup(t);
  env.registry.register({name: 'tags.list', expose: {'admin-chat': true}, requiredPermissions: ['taxonomy:read'], inputSchema: {type: 'object'},
    description: 'tags', execute: async(_, context) => {assert.equal(context.principal.id, 1); return [{id: 2, name: '测试'}]}}, 'core');
  let n = 0;
  env.output(() => n++ ? {text: '找到一个标签'} : {toolCalls: [{id: 'call-1', name: 'tags.list', input: {}}]});
  assert.equal(await env.run(), 'completed');
  const history = await env.store.model('chat/message').listForSession(env.session.id);
  assert.equal(history[1].role, 'tool');
  assert.match(history[1].content, /测试/);
  assert.equal(history[2].content, '找到一个标签');
});
test('write waits for confirmation, rechecks object version, and never executes twice', async t => {
  const env = await setup(t);
  let writes = 0, version = 1;
  env.registry.register({name: 'settings.update', description: 'settings', expose: {'admin-chat': true}, requiredPermissions: ['settings:write'],
    requiresApproval: true, inputSchema: {type: 'object'}, execute: async() => {writes++; return {updated: ['title']}}}, 'core');
  env.agent.snapshot = async() => ({title: version});
  env.output({toolCalls: [{id: 'call-2', name: 'settings.update', input: {settings: {title: '新标题'}}}]});
  assert.equal(await env.run(), 'waiting');
  assert.equal(writes, 0);
  const action = (await env.store.model('chat/action').listForSession(env.session.id))[0];
  version = 2;
  env.output({text: '对象变更，未执行'});
  await env.run({id: action.id, approve: true});
  assert.equal(writes, 0);
  assert.equal((await env.store.model('chat/action').listForSession(env.session.id))[0].status, 'failed');
  await assert.rejects(env.run({id: action.id, approve: true}), /已处理/);
});
test('confirmation executes once and cancellation closes tool calls without writes', async t => {
  for (const approve of [false, true]) {
    const env = await setup(t);
    let writes = 0;
    env.registry.register({name: 'demo.write', description: 'write', expose: {'admin-chat': true}, inputSchema: {type: 'object'},
      execute: async() => {writes++; return {ok: true}}}, 'core');
    env.output({toolCalls: [{id: 'call', name: 'demo.write', input: {}}]});
    await env.run();
    const action = (await env.store.model('chat/action').listForSession(env.session.id))[0];
    env.output({text: approve ? '已执行' : '已取消'});
    await env.run({id: action.id, approve});
    assert.equal(writes, approve ? 1 : 0);
    assert.equal((await env.store.model('chat/action').listForSession(env.session.id))[0].status, approve ? 'completed' : 'cancelled');
    await assert.rejects(env.run({id: action.id, approve}), /已处理/);
  }
});
test('legacy model supports plain text and does not receive tools', async t => {
  const env = await setup(t);
  env.ai.models = async() => [{id: 'test', models: [{id: 'model', capabilities: ['text']}]}];
  env.ai.generate = async request => {assert.equal(request.tools, undefined); return {text: '普通问答'}};
  await env.run();
  assert.equal((await env.store.model('chat/message').listForSession(env.session.id))[0].content, '普通问答');
});
test('aborted runs cannot invoke tools and stale runs are recovered without replay', async t => {
  const env = await setup(t);
  const signal = AbortSignal.abort();
  await assert.rejects(env.agent.run({session: env.session, user: env.user, run: 'x', signal, emit() {}}));
  const run = await env.store.claim(env.session, 'stale');
  await env.store.model('chat/message').append(env.session.id, {role: 'assistant', content: '', toolCalls: [{id: 'uncertain', name: 'posts.publish', input: {id: 2}}]});
  await env.store.model('chat/run').where({id: run}).update({expires_at: 0});
  await env.store.recover(await env.store.session(env.session.id, env.user));
  await env.store.reconcile(env.session.id);
  assert.equal((await env.store.session(env.session.id, env.user)).active_run, '');
  assert.match((await env.store.model('chat/message').listForSession(env.session.id)).at(-1).content, /禁止自动重试/);
});
test('permission filter and schema validation reject unauthorized and malformed requests', async t => {
  const env = await setup(t);
  assert.equal(authorize({type: 2}, 'settings:write'), false);
  assert.equal(authorize({type: 4}, 'posts:write'), false);
  env.registry.register({name: 'settings.update', description: 'settings', requiredPermissions: ['settings:write'], expose: {'admin-chat': true}, execute() {}}, 'core');
  assert.equal(env.agent.tools({type: 2}).length, 0);
  assert.throws(() => validate({id: '1'}, {type: 'object', properties: {id: {type: 'integer', minimum: 1}}}));
  assert.throws(() => validate({extra: true}, {type: 'object', additionalProperties: false, properties: {}}));
});
test('expired confirmations close safely without executing', async t => {
  const env = await setup(t);
  let writes = 0;
  env.registry.register({name: 'demo.write', description: 'write', expose: {'admin-chat': true},
    execute: async() => {writes++; return {ok: true}}}, 'core');
  env.output({toolCalls: [{id: 'expired-call', name: 'demo.write', input: {}}]});
  await env.run();
  const action = (await env.store.model('chat/action').listForSession(env.session.id))[0];
  await env.store.model('chat/action').where({id: action.id}).update({expires_at: 0});
  env.output({text: '确认已过期'});
  await env.run({id: action.id, approve: true});
  assert.equal(writes, 0);
  assert.equal((await env.store.model('chat/action').listForSession(env.session.id))[0].status, 'cancelled');
});
test('idle metadata operations cannot race active runs', async t => {
  const {store, session} = await setup(t);
  await store.withIdle(session, async() => {
    await assert.rejects(store.claim(session, 'blocked'), /正在运行/);
  });
  const run = await store.claim(session, 'allowed');
  await assert.rejects(store.withIdle(session, async() => {}), /正在运行/);
  await store.finish(session.id, run, 'completed');
});
test('namespaced chat models preserve existing table names and persisted history', async t => {
  const {store, user} = await setup(t);
  const legacyId = 'legacy-session';
  await store.query("INSERT INTO test_chat_session (id, user_id, title, active_run, updated_at) VALUES ('legacy-session', 1, 'Existing chat', '', 1)");
  assert.equal((await store.session(legacyId, user)).title, 'Existing chat');
  for (const name of ['session', 'message', 'action', 'run']) {
    assert.equal(store.model(`chat/${name}`).tableName, `test_chat_${name}`);
  }
  await store.model('chat/message').append(legacyId, {role: 'user', content: 'after upgrade'});
  const rows = await store.query("SELECT payload FROM test_chat_message WHERE session_id = 'legacy-session'");
  assert.equal(JSON.parse(rows[0].payload).content, 'after upgrade');
  await store.updateSession(legacyId, {title: 'Renamed'});
  assert.equal((await store.session(legacyId, user)).title, 'Renamed');
});
