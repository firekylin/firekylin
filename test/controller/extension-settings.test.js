'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const auth = require('../../src/service/admin-auth');
const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/admin/api/extension-settings.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/extension-settings');
} finally { Module._load = load }

test('extension settings require administrator and CSRF and persist independent URLs', async() => {
  const controller = new Controller();
  const secret = 'extension-settings-test-secret-32-bytes';
  const cookie = auth.sign({id: 1, type: 1, name: 'admin'}, secret);
  controller.ctx = {state: {jwtSecret: secret}, cookie: () => cookie, headers: {},
    get(name) { return this.headers[name] || '' },
    throw(status) { throw Object.assign(new Error('denied'), {status}) }};
  controller.userInfo = {type: 2};
  controller.get = () => undefined;
  const rows = {};
  controller.model = () => ({getOptions: async() => rows,
    updateOptions: async(key, value) => { rows[key] = value }});
  controller.post = () => ({settings: {pluginRegistry: 'https://firekylin.lithub.cc/plugins/plugins.json',
    themeRegistry: 'https://firekylin.lithub.cc/plugins/themes.json'}});
  controller.success = data => data;
  await assert.rejects(controller.getAction(), {status: 403});
  controller.userInfo.type = 1;
  await assert.rejects(controller.postAction(), {status: 403});
  controller.ctx.headers['X-CSRF-Token'] = auth.csrfToken(controller.ctx);
  await controller.postAction();
  assert.equal((await controller.getAction()).settings.themeRegistry, 'https://firekylin.lithub.cc/plugins/themes.json');
  controller.post = () => ({settings: {pluginRegistry: 'http://127.0.0.1/', themeRegistry: 'https://firekylin.lithub.cc/plugins/t'}});
  await assert.rejects(controller.postAction(), {status: 400});
});

test('registry read selects the requested extension type and reports upstream errors', async t => {
  const previous = global.fetch;
  t.after(() => { global.fetch = previous });
  const controller = new Controller();
  controller.userInfo = {type: 1};
  controller.ctx = {throw(status, message) { throw Object.assign(new Error(message), {status}) }};
  controller.model = () => ({getOptions: async() => ({})});
  controller.get = () => 'theme';
  controller.success = data => data;
  global.fetch = async() => new Response(JSON.stringify({schemaVersion: 1, packages: [
    {type: 'plugin', name: 'plugin', version: '1'}, {type: 'theme', name: 'theme', version: '1'}
  ]}));
  assert.deepEqual((await controller.getAction()).items.map(item => item.name), ['theme']);
  global.fetch = async() => new Response(null, {status: 404});
  await assert.rejects(controller.getAction(), {status: 502, message: 'Registry unavailable: REGISTRY_HTTP_404'});
});
