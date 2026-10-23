'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const auth = require('../../src/service/admin-auth');
const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/admin/api/ai-logs.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/ai-logs');
} finally { Module._load = load }
function setup(type = 1) {
  const instance = new Controller(), settings = {}, calls = [];
  const secret = 'audit-controller-test-secret-32-bytes';
  const cookie = auth.sign({id: 1, type, name: 'tester'}, secret);
  instance.userInfo = {id: 1, type};
  instance.ctx = {state: {jwtSecret: secret}, cookie: () => cookie, headers: {},
    get(name) {return this.headers[name] || ''},
    throw(status) {throw Object.assign(new Error('denied'), {status})}};
  instance.get = () => ({});
  instance.post = () => ({});
  instance.model = name => name === 'options' ? {getOptions: async() => settings,
    updateOptions: async(key, value) => {settings[key] = value}} : {
    where: where => ({find: async() => where.id === 1 ? {id: 1, request_text: 'detail text'} : {},
      delete: async() => {calls.push(where); return 2}})
  };
  instance.success = data => {instance.result = data; throw new Error('PREVENT_NEXT_PROCESS')};
  return {instance, calls, settings};
}
test('all read and write audit endpoints deny non-administrators', async() => {
  for (const type of [2, 4]) {
    const {instance} = setup(type);
    await assert.rejects(instance.getAction(), {status: 403});
    await assert.rejects(instance.postAction(), {status: 403});
  }
});
test('cleanup requires CSRF and the retired settings operation cannot change recording', async() => {
  const {instance, calls} = setup();
  instance.post = () => ({action: 'cleanup', ids: [1, 2]});
  await assert.rejects(instance.postAction(), {status: 403});
  instance.ctx.headers['X-CSRF-Token'] = auth.csrfToken(instance.ctx);
  await assert.rejects(instance.postAction(), /PREVENT_NEXT_PROCESS/);
  assert.equal(instance.result.deleted, 2);
  assert.deepEqual(calls, [{id: ['IN', [1, 2]]}]);
  instance.post = () => ({action: 'settings', recordContent: false});
  await assert.rejects(instance.postAction(), {status: 400});
  instance.post = () => ({action: 'cleanup'});
  await assert.rejects(instance.postAction(), {status: 400});
});
test('detail requires valid ID and keeps response termination outside error handling', async() => {
  const {instance} = setup();
  instance.get = () => ({id: '1'});
  await assert.rejects(instance.getAction(), /PREVENT_NEXT_PROCESS/);
  assert.equal(instance.result.request_text, 'detail text');
  instance.get = () => ({id: '2'});
  await assert.rejects(instance.getAction(), {status: 404});
  instance.get = () => ({id: '1 OR 1=1'});
  await assert.rejects(instance.getAction(), {status: 400});
});

test('inherited REST mutation methods cannot bypass CSRF or update audit rows', () => {
  const {instance} = setup();
  assert.throws(() => instance.putAction(), {status: 403});
  assert.throws(() => instance.deleteAction(), {status: 403});
  instance.ctx.headers['X-CSRF-Token'] = auth.csrfToken(instance.ctx);
  assert.throws(() => instance.putAction(), {status: 405});
  assert.throws(() => instance.deleteAction(), {status: 405});
});

test('filtered cleanup reuses validated list filters and still requires administrator CSRF', async() => {
  const {instance, calls} = setup();
  instance.post = () => ({action: 'cleanup', scope: 'filtered', filters: {provider: 'deepseek', status: 'failure'}});
  await assert.rejects(instance.postAction(), {status: 403});
  instance.ctx.headers['X-CSRF-Token'] = auth.csrfToken(instance.ctx);
  await assert.rejects(instance.postAction(), /PREVENT_NEXT_PROCESS/);
  assert.deepEqual(calls, [{provider: 'deepseek', status: 'failure'}]);
  assert.equal(instance.result.deleted, 2);
});

test('caller options include backend roles only and never expose credential fields', async() => {
  const {instance} = setup();
  const queries = [];
  instance.model = name => {
    const chain = {where(condition) {queries.push({name, condition}); return chain},
      field(fields) {chain.fields = fields; return chain}, setRelation: () => chain, order: () => chain,
      page: () => chain, select: async() => name === 'user' ? [{id: 1, name: 'admin'}] : [],
      find: async() => ({calls: 0})};
    return chain;
  };
  await assert.rejects(instance.getAction(), /PREVENT_NEXT_PROCESS/);
  assert.deepEqual(queries.find(item => item.name === 'user').condition, {type: ['IN', [1, 2, 3]]});
  assert.deepEqual(instance.result.actors, [{id: 1, name: 'admin'}]);
  assert.equal(instance.result.settings, undefined);
});
