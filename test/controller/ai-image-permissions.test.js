'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const auth = require('../../src/service/admin-auth');
const original = Module._load;
let Base;
try {
  Module._load = function(name, parent, ...args) {
    if (name === '../rest' && parent.filename.endsWith('/admin/api/base.js')) return class {};
    return original.call(this, name, parent, ...args);
  };
  Base = require('../../src/controller/admin/api/base');
} finally {Module._load = original}

for (const type of [1, 2, 4, null]) {
  test(`image generation permission for role ${type}`, async t => {
    const previous = global.think;
    global.think = {isEmpty: value => !value || Object.keys(value).length === 0};
    t.after(() => {global.think = previous});
    const secret = 'image-permission-test-secret-at-least-32-bytes';
    const cookie = type ? auth.sign({id: 1, type, name: 'tester'}, secret) : '';
    const controller = new Base();
    controller.ctx = {controller: 'admin/api/ai-image', action: 'post', state: {}, cookie: () => cookie,
      referrer: () => 'https://blog.example/admin/media'};
    controller.model = () => ({getOptions: async() => ({jwt_secret: secret, site_url: 'https://blog.example'})});
    controller.fail = message => {throw new Error(message)};
    if (type === 1 || type === 2) await controller.__before();
    else await assert.rejects(controller.__before(), new RegExp(type ? 'USER_NO_PERMISSION' : 'USER_NOT_LOGIN'));
  });
}
