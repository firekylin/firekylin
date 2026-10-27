'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const auth = require('../../src/service/admin-auth');
const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/admin/api/extension-github.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/extension-github');
} finally { Module._load = load }

test('GitHub connection requires admin and CSRF and never returns a token', async t => {
  const prior = global.fetch;
  t.after(() => { global.fetch = prior });
  global.fetch = async() => ({ok: true, json: async() => ({full_name: 'owner/site', permissions: {push: true}})});
  const rows = new Map();
  const model = {getOptions: async() => ({jwt_secret: 'test-secret-at-least-16-characters'}),
    getCredentialValue: async key => rows.get(key), setCredentialValue: async(key, value) => rows.set(key, value),
    deleteCredentialValue: async key => rows.delete(key)};
  const controller = new Controller();
  const secret = 'github-controller-test-secret-32-bytes';
  const cookie = auth.sign({id: 1, type: 1, name: 'admin'}, secret);
  controller.ctx = {state: {jwtSecret: secret}, cookie: () => cookie, headers: {},
    get(name) { return this.headers[name] || '' },
    throw(status) { throw Object.assign(new Error('denied'), {status}) }};
  controller.userInfo = {type: 2};
  controller.model = () => model;
  controller.success = data => data;
  controller.post = () => ({repository: 'https://github.com/owner/site', token: 'private-token'});
  await assert.rejects(controller.getAction(), {status: 403});
  controller.userInfo.type = 1;
  await assert.rejects(controller.postAction(), {status: 403});
  controller.ctx.headers['X-CSRF-Token'] = auth.csrfToken(controller.ctx);
  assert.deepEqual(await controller.postAction(), {repository: 'https://github.com/owner/site', connected: true});
  assert.equal(JSON.stringify(await controller.getAction()).includes('private-token'), false);
  controller.post = () => ({disconnect: true});
  assert.deepEqual(await controller.postAction(), {connected: false});
});
