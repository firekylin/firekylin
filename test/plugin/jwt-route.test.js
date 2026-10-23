'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../../src/service/admin-auth');
const pluginRoutes = require('../../src/plugin/middleware');

test('plugin admin routes authenticate JWT and reject invalid CSRF tokens', async() => {
  const secret = 'plugin-jwt-test-secret-with-at-least-32-bytes';
  const cookies = new Map();
  let handledBody;
  const route = {
    auth: 'admin',
    csrf: true,
    pluginId: 'demo',
    regexp: new RegExp('^/api/plugins/demo/refresh$'),
    names: [],
    async handler({body}) { handledBody = body; return {ok: true} }
  };
  global.firekylin = {plugins: {routes: {match: () => route}}};
  global.think = {
    model: () => ({async getOptions() { return {jwt_secret: secret} }})
  };
  const ctx = {
    method: 'POST',
    path: '/api/plugins/demo/refresh',
    request: {body: {post: {refresh: true}}},
    state: {},
    query: {},
    headers: {},
    get(name) { return this.headers[name] || '' },
    cookie(name) { return cookies.get(name) },
    throw(status, message) { throw Object.assign(new Error(message), {status}) }
  };
  const middleware = pluginRoutes();
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
  cookies.set(auth.COOKIE_NAME, auth.sign({id: 1, name: 'admin', type: 1}, secret));
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
  ctx.headers['X-CSRF-Token'] = auth.csrfToken(ctx);
  await middleware(ctx, () => {});
  assert.deepEqual(ctx.body, {ok: true});
  assert.deepEqual(handledBody, {refresh: true});
  cookies.set(auth.COOKIE_NAME, auth.sign({id: 2, name: 'editor', type: 2}, secret));
  ctx.headers['X-CSRF-Token'] = auth.csrfToken(ctx);
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
});

test('declarative admin endpoints require an administrator and CSRF on writes', async() => {
  const secret = 'plugin-admin-ui-secret-with-at-least-32-bytes';
  const cookies = new Map();
  const calls = [];
  global.firekylin = {plugins: {
    routes: {match: () => null},
    admin: {
      manifest: () => [{id: 'demo'}],
      async loadPage() { return {content: {}} },
      async loadForm() { return {} },
      async submitForm(pluginId, formId, body) { calls.push({pluginId, formId, body}); return {message: 'saved'} },
      async runAction() { return {} }
    }
  }};
  global.think = {model: () => ({async getOptions() { return {jwt_secret: secret} }})};
  const ctx = {
    method: 'GET', path: '/admin/api/plugins', request: {body: {}}, state: {}, headers: {},
    get(name) { return this.headers[name] || '' },
    cookie(name) { return cookies.get(name) },
    throw(status, message) { throw Object.assign(new Error(message), {status}) }
  };
  const middleware = pluginRoutes();
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
  cookies.set(auth.COOKIE_NAME, auth.sign({id: 1, name: 'admin', type: 1}, secret));
  await middleware(ctx, () => {});
  assert.equal(ctx.body.data[0].id, 'demo');

  ctx.method = 'POST';
  ctx.path = '/admin/api/plugins/demo/forms/settings';
  ctx.request.body = {post: {enabled: true}};
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
  ctx.headers['X-CSRF-Token'] = auth.csrfToken(ctx);
  await middleware(ctx, () => {});
  assert.deepEqual(calls, [{pluginId: 'demo', formId: 'settings', body: {enabled: true}}]);
  assert.equal(ctx.body.data.message, 'saved');
});

test('plugin middleware leaves AI connections to the admin controller', async() => {
  global.firekylin = {plugins: {routes: {match: () => null}}};
  const ctx = {method: 'GET', path: '/admin/api/ai-connections'};
  let reachedController = false;
  await pluginRoutes()(ctx, () => { reachedController = true });
  assert.equal(reachedController, true);
});
