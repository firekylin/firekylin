'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../../src/service/admin-auth');

for (const type of [1, 2, 4, null]) {
  test(`image generation permission for role ${type}`, async t => {
    const previous = global.think;
    global.think = {Logic: class {}, isEmpty: value => !value || Object.keys(value).length === 0};
    const previousFirekylin = global.firekylin;
    global.firekylin = {USER_ADMIN: 1, USER_EDITOR: 2, USER_COMMENTER: 4};
    t.after(() => {global.firekylin = previousFirekylin});
    const Base = require('../../src/logic/admin/api/base');
    t.after(() => {global.think = previous});
    const secret = 'image-permission-test-secret-at-least-32-bytes';
    const cookie = type ? auth.sign({id: 1, type, name: 'tester'}, secret) : '';
    const controller = new Base();
    controller.ctx = {controller: 'admin/api/ai-image', action: 'post', method: 'POST', state: {}, cookie: () => cookie,
      referrer: () => 'https://blog.example/admin/media'};
    controller.ctx.get = () => auth.csrfToken({...controller.ctx, state: {jwtSecret: secret}});
    controller.model = () => ({getOptions: async() => ({jwt_secret: secret, site_url: 'https://blog.example'})});
    controller.fail = message => {throw new Error(message)};
    if (type === 1 || type === 2) await controller.__before();
    else await assert.rejects(controller.__before(), new RegExp(type ? 'USER_NO_PERMISSION' : 'USER_NOT_LOGIN'));
  });
}
