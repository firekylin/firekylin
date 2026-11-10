'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../../src/service/admin-auth');

test('shared API logic rejects missing/wrong CSRF before chat writes', async t => {
  const previous = global.think;
  global.think = {Logic: class {}, isEmpty: value => !value || Object.keys(value).length === 0};
  const previousFirekylin = global.firekylin;
  global.firekylin = {USER_ADMIN: 1, USER_EDITOR: 2, USER_COMMENTER: 4};
  t.after(() => {global.firekylin = previousFirekylin});
  t.after(() => {global.think = previous});
  const Logic = require('../../src/logic/admin/api/chat');
  const logic = new Logic();
  const secret = 'chat-logic-test-secret-long-enough-32';
  logic.model = () => ({getOptions: async() => ({jwt_secret: secret, site_url: 'https://example.invalid'})});
  logic.ctx = {controller: 'admin/api/chat', action: 'post', referrer: () => 'https://example.invalid/admin',
    method: 'POST', state: {}, cookie: () => auth.sign({id: 1, type: 1}, secret),
    get: () => '', throw: status => {throw Object.assign(Error('denied'), {status})}};
  await assert.rejects(logic.__before(), {status: 403});
  logic.ctx.get = () => 'wrong';
  await assert.rejects(logic.__before(), {status: 403});
  logic.ctx.get = () => auth.csrfToken(logic.ctx);
  await logic.__before();
  logic.ctx.method = 'GET'; logic.ctx.get = () => '';
  await logic.__before();
});
