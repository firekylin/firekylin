'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const auth = require('../../src/service/admin-auth');
const {FEATURES_KEY} = require('../../src/service/ai-editor-features');

const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/admin/api/smart-content.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/smart-content');
} finally { Module._load = load }
function setup(t, type = 1) {
  const previous = global.firekylin;
  t.after(() => { global.firekylin = previous });
  global.firekylin = {};
  const rows = {};
  const instance = new Controller();
  const secret = 'core-content-controller-test-secret-32-bytes';
  const cookie = auth.sign({id: 1, type, name: 'tester'}, secret);
  instance.userInfo = {id: 1, type};
  instance.ctx = {state: {jwtSecret: secret}, cookie: () => cookie, headers: {},
    get(name) { return this.headers[name] || '' },
    throw(status) { throw Object.assign(new Error('denied'), {status}) }};
  instance.model = () => ({getOptions: async() => ({...rows}),
    updateOptions: async(key, value) => {rows[key] = value}});
  instance.success = data => ({errno: 0, data});
  return {instance, rows};
}
test('core smart content settings load and save without any plugin', async t => {
  const {instance, rows} = setup(t);
  const initial = await instance.getAction();
  assert.equal(initial.data.features.title, true);
  assert.equal(initial.data.features.slug, false);
  instance.post = () => ({features: {slug: true, title: false}});
  await assert.rejects(instance.postAction(), {status: 403});
  instance.ctx.headers['X-CSRF-Token'] = auth.csrfToken(instance.ctx);
  const result = await instance.postAction();
  assert.equal(result.data.features.slug, true);
  assert.equal(JSON.parse(rows[FEATURES_KEY]).title, false);
  assert.equal((await instance.getAction()).data.features.slug, true);
  instance.post = () => ({features: {slug: 'true'}});
  await assert.rejects(instance.postAction(), {status: 400});
  instance.post = () => ({features: {language: 'English'}});
  await assert.rejects(instance.postAction(), {status: 400});
});
test('non-administrators cannot read or change core smart content settings', async t => {
  const {instance} = setup(t, 2);
  await assert.rejects(instance.getAction(), {status: 403});
  await assert.rejects(instance.postAction(), {status: 403});
});

test('smart content returns model choices and validates bindings before saving feature switches', async t => {
  const {instance, rows} = setup(t);
  const {PluginManager} = require('../../src/plugin/manager');
  const {AIStore} = require('../../src/ai/store');
  const manager = new PluginManager({aiStore: new AIStore({getOptions: async() => rows, getCredentialValue: async() => undefined,
    updateOptions: async(key, value) => {rows[key] = value}})});
  manager.aiProviders.register({id: 'provider', models: [{id: 'text'}], generate() {}});
  global.firekylin = {plugins: manager};
  instance.ctx.headers['X-CSRF-Token'] = auth.csrfToken(instance.ctx);
  instance.post = () => ({features: {summary: true}, models: {summary: {provider: 'provider', model: 'text'}}});
  await instance.postAction();
  const loaded = (await instance.getAction()).data;
  assert.deepEqual(loaded.models, {summary: {provider: 'provider', model: 'text'}});
  assert.equal(loaded.providers[0].id, 'provider');
  instance.post = () => ({features: {summary: false}, models: {summary: {provider: 'missing', model: 'text'}}});
  await assert.rejects(instance.postAction(), {status: 400});
  assert.equal(JSON.parse(rows[FEATURES_KEY]).summary, true);
  instance.post = () => ({features: {summary: false}});
  await instance.postAction();
  assert.deepEqual((await instance.getAction()).data.models, loaded.models, 'old clients preserve bindings');
  instance.post = () => ({features: {summary: false}, models: {}});
  await instance.postAction();
  assert.deepEqual((await instance.getAction()).data.models, {});
});

test('disabled features retain unavailable bindings but cannot introduce new invalid selections', async t => {
  const {instance, rows} = setup(t);
  const {PluginManager} = require('../../src/plugin/manager');
  const {AIStore} = require('../../src/ai/store');
  rows.ai_content_models = JSON.stringify({summary: {provider: 'removed', model: 'old'}});
  const manager = new PluginManager({aiStore: new AIStore({getOptions: async() => rows,
    getCredentialValue: async() => undefined, updateOptions: async(key, value) => {rows[key] = value}})});
  global.firekylin = {plugins: manager};
  instance.ctx.headers['X-CSRF-Token'] = auth.csrfToken(instance.ctx);
  const models = {summary: {provider: 'removed', model: 'old'}};
  instance.post = () => ({features: {summary: false}, models});
  await instance.postAction();
  assert.deepEqual(JSON.parse(rows.ai_content_models), models);
  instance.post = () => ({features: {summary: true}, models});
  await assert.rejects(instance.postAction(), {status: 400});
  instance.post = () => ({features: {summary: false}, models: {summary: {provider: 'removed', model: 'new'}}});
  await assert.rejects(instance.postAction(), {status: 400});
});
