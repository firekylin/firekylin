'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('think-model/lib/model');
const handle = require('think-model-sqlite');
const fs = require('node:fs');
const path = require('node:path');
const {migrate} = require('../../src/service/migration-runner');
test('web installation runs all discovered migrations on its database before marking installed', async t => {
  const previous = {think: global.think, firekylin: global.firekylin};
  // No global model/config/service is available: installation must use its own database.
  global.think = {Service: class {}, logger: {error: () => assert.fail('unexpected optional migration failure')}};
  t.after(() => {global.think = previous.think; global.firekylin = previous.firekylin});
  const Install = require('../../src/service/install');
  const service = Object.create(Install.prototype);
  service.type = 'sqlite';
  service.dbConfig = {handle, path: ':memory:', database: 'migration-install', prefix: 'fresh_', logConnect: false, debounce: false};
  const options = {site_url: 'https://example.com'};
  const optionModel = {getOptions: async() => ({...options}), updateOptions: async(key, value) => {options[key] = value}};
  service.getModel = name => name === 'options' ? optionModel : new Model(name, service.dbConfig);
  const model = service.getModel('user');
  t.after(() => model.db().query.socket().close());
  service.insertData = async() => {
    for (const sql of ['CREATE TABLE fresh_user (id INTEGER PRIMARY KEY)',
      'CREATE TABLE fresh_cate (id INTEGER PRIMARY KEY)',
      'CREATE TABLE fresh_post (id INTEGER PRIMARY KEY, type INTEGER, pathname TEXT)']) await model.query(sql);
  };
  let schemaReady = false;
  service.createAccount = async() => {
    for (const name of ['comment', 'counter', 'user_social', 'mcp_oauth_client', 'mcp_oauth_grant',
      'ai_audit_log', 'chat_session', 'chat_message', 'chat_run', 'chat_action']) {
      assert.equal(await service.getModel(name).count(), 0, name);
    }
    assert.ok((await model.query('PRAGMA table_info(fresh_cate)')).some(field => field.name === 'description'));
    assert.ok((await model.query('PRAGMA table_info(fresh_ai_audit_log)')).some(field => field.name === 'request_context'));
    schemaReady = true;
  };
  service.addStartPost = async() => {};
  let installed = false;
  global.firekylin = {setInstalled: () => {assert.equal(schemaReady, true); installed = true}};
  await service.saveSiteInfo({});
  assert.equal(installed, true);
  const directory = path.resolve(__dirname, '../../src/service/migration');
  for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.js'))) {
    assert.equal(options[`migration_${path.basename(file, '.js')}`], String(require(path.join(directory, file)).version));
  }
  // Startup must recognize the same completion markers, without another schema query.
  await migrate({runtime: {model: name => {
    assert.equal(name, 'options'); return optionModel;
  }, config: () => assert.fail('completed migrations should not read config')}});
});
