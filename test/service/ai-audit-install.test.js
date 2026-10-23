'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('think-model/lib/model');
const handle = require('think-model-sqlite');
test('web installation creates audit schema before marking the site installed, without a restart', async t => {
  const previous = {think: global.think, firekylin: global.firekylin};
  global.think = {Service: class {}, service: () => ({migrate: async() => {}}), logger: {error: () => {}}};
  t.after(() => {global.think = previous.think; global.firekylin = previous.firekylin});
  const Install = require('../../src/service/install');
  const service = Object.create(Install.prototype);
  service.type = 'sqlite';
  service.dbConfig = {handle, path: ':memory:', database: 'audit-install', prefix: 'fresh_', logConnect: false, debounce: false};
  const model = new Model('ai_audit_log', service.dbConfig);
  const socket = model.db().query.socket();
  t.after(async() => {await socket.close()});
  service.insertData = service.createAccount = service.addStartPost = async() => {};
  service.getModel = name => name === 'options' ? {getOptions: async() => ({})} : model;
  let schemaReady = false;
  service.createAccount = async() => {
    assert.equal(await model.count(), 0);
    const fields = await model.query('PRAGMA table_info(fresh_ai_audit_log)');
    assert.ok(fields.some(field => field.name === 'request_context'));
    schemaReady = true;
  };
  let installed = false;
  global.firekylin = {setInstalled: () => {
    assert.equal(schemaReady, true);
    installed = true;
  }};
  await service.saveSiteInfo({});
  assert.equal(installed, true);
  assert.equal(await model.count(), 0);
  const fields = await model.query('PRAGMA table_info(fresh_ai_audit_log)');
  assert.ok(fields.some(field => field.name === 'request_context'));
});
