'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const auth = require('../../src/service/admin-auth');
const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/admin/api/marketplace.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/marketplace');
} finally { Module._load = load }

test('plugin state mutations require an administrator and CSRF, then persist the selected state', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-api-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name: 'demo', version: '1.0.0',
    firekylin: {id: 'demo', entry: 'plugin.js', type: 'plugin'}}));
  fs.writeFileSync(path.join(root, 'plugin.js'), 'module.exports = {}');
  const old = global.firekylin;
  t.after(() => { global.firekylin = old });
  const values = [];
  global.firekylin = {plugins: {discover: () => [root], stateStore: {set: async(...args) => values.push(args)}}};
  const controller = new Controller();
  const secret = 'marketplace-controller-test-secret-32-bytes';
  const cookie = auth.sign({id: 1, type: 1, name: 'admin'}, secret);
  controller.ctx = {state: {jwtSecret: secret}, cookie: () => cookie, headers: {},
    get(name) { return this.headers[name] || '' },
    throw(status) { throw Object.assign(new Error('denied'), {status}) }};
  controller.userInfo = {type: 2};
  controller.post = key => ({operation: 'plugin.enable', id: 'demo'})[key];
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  controller.catalog = () => ({check: () => ({compatible: true})});
  assert.throws(() => controller.postAction(), {status: 403});
  controller.userInfo.type = 1;
  assert.throws(() => controller.postAction(), {status: 403});
  controller.ctx.headers['X-CSRF-Token'] = auth.csrfToken(controller.ctx);
  const result = await controller.postAction();
  assert.equal(result.errno, 0);
  assert.deepEqual(values, [['demo', true]]);
});

test('local deletion rejects active plugins and paths outside the plugin directory', async t => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-delete-'));
  t.after(() => fs.rmSync(project, {recursive: true, force: true}));
  const base = path.join(project, 'plugins');
  const root = path.join(base, 'demo');
  fs.mkdirSync(root, {recursive: true});
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name: 'demo', version: '1.0.0',
    firekylin: {id: 'demo', entry: 'plugin.js', type: 'plugin'}}));
  const previous = global.firekylin;
  t.after(() => { global.firekylin = previous });
  const states = [];
  const manager = {discover: () => [fs.realpathSync(root)], pluginRoot: () => base,
    plugins: new Map([['demo', {status: 'active'}]]), stateStore: {set: async(...args) => states.push(args)}};
  global.firekylin = {plugins: manager};
  const controller = new Controller();
  controller.post = key => key === 'id' ? 'demo' : undefined;
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  assert.equal((await controller.mutate('plugin.delete-local')).message, 'PLUGIN_MUST_BE_DISABLED');
  assert.equal(fs.existsSync(root), true);
  manager.plugins.clear();
  manager.pluginRoot = () => project;
  assert.equal((await controller.mutate('plugin.delete-local')).message, 'INVALID_LOCAL_PLUGIN_PATH');
  assert.equal(fs.existsSync(root), true);
  manager.pluginRoot = () => base;
  assert.equal((await controller.mutate('plugin.delete-local')).errno, 0);
  assert.equal(fs.existsSync(root), false);
  assert.deepEqual(states, [['demo', false]]);
});

test('preserves ThinkJS response control flow after successful state changes', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-response-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name: 'demo', version: '1.0.0',
    firekylin: {id: 'demo', entry: 'plugin.js', type: 'plugin'}}));
  const previous = global.firekylin;
  t.after(() => { global.firekylin = previous });
  const states = [];
  global.firekylin = {plugins: {discover: () => [root], stateStore: {set: async(...args) => states.push(args)}}};
  const controller = new Controller();
  controller.post = key => key === 'id' ? 'demo' : undefined;
  controller.success = () => { throw new Error('PREVENT_NEXT_PROCESS') };
  controller.fail = () => { throw new Error('unexpected failure response') };
  await assert.rejects(controller.mutate('plugin.disable'), {message: 'PREVENT_NEXT_PROCESS'});
  assert.deepEqual(states, [['demo', false]]);
});

test('deletes a malformed local plugin and clears its cached record', async t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-invalid-'));
  t.after(() => fs.rmSync(base, {recursive: true, force: true}));
  const root = path.join(fs.realpathSync(base), 'broken');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name: 'broken', version: 'invalid'}));
  const previous = global.firekylin;
  t.after(() => { global.firekylin = previous });
  const manager = {discover: () => fs.existsSync(root) ? [root] : [], pluginRoot: () => base,
    plugins: new Map([['broken', {root, status: 'error'}]]), states: new Map([['broken', {}]]),
    stateStore: {set: async() => {}}};
  global.firekylin = {plugins: manager};
  const controller = new Controller();
  controller.post = key => key === 'id' ? 'broken' : undefined;
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  assert.equal((await controller.mutate('plugin.delete-local')).errno, 0);
  assert.equal(fs.existsSync(root), false);
  assert.equal(manager.plugins.has('broken'), false);
  assert.equal(manager.states.has('broken'), false);
});
