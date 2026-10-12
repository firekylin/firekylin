'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../../src/service/admin-auth');
const pluginRoutes = require('../../src/plugin/middleware');

test('plugin admin routes authenticate JWT and reject invalid CSRF tokens', async() => {
  process.env.FIREKYLIN_JWT_SECRET = 'plugin-jwt-test-secret-with-at-least-32-bytes';
  const cookies = new Map();
  const route = {
    auth: 'admin',
    csrf: true,
    pluginId: 'demo',
    regexp: new RegExp('^/api/plugins/demo/refresh    names: [],
    async handler() { return {ok: true} }
  };
  global.firekylin = {plugins: {routes: {match: () => route}}};
  const ctx = {
    method: 'POST',
    path: '/api/plugins/demo/refresh',
    request: {body: {}},
    query: {},
    headers: {},
    get(name) { return this.headers[name] || '' },
    cookie(name) { return cookies.get(name) },
    throw(status, message) { throw Object.assign(new Error(message), {status}) }
  };
  const middleware = pluginRoutes();
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
  cookies.set(auth.COOKIE_NAME, auth.sign({id: 1, name: 'admin', type: 1}));
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
  ctx.headers['X-CSRF-Token'] = auth.csrfToken(ctx);
  await middleware(ctx, () => {});
  assert.deepEqual(ctx.body, {ok: true});
  cookies.set(auth.COOKIE_NAME, auth.sign({id: 2, name: 'editor', type: 2}));
  ctx.headers['X-CSRF-Token'] = auth.csrfToken(ctx);
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
});
),
    names: [],
    async handler() { return {ok: true} }
  };
  global.firekylin = {plugins: {routes: {match: () => route}}};
  const ctx = {
    method: 'POST',
    path: '/api/plugins/demo/refresh',
    request: {body: {}},
    query: {},
    headers: {},
    get(name) { return this.headers[name] || '' },
    cookie(name) { return cookies.get(name) },
    throw(status, message) { throw Object.assign(new Error(message), {status}) }
  };
  const middleware = pluginRoutes();
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
  cookies.set(auth.COOKIE_NAME, auth.sign({id: 1, name: 'admin', type: 1}));
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
  ctx.headers['X-CSRF-Token'] = auth.csrfToken(ctx);
  await middleware(ctx, () => {});
  assert.deepEqual(ctx.body, {ok: true});
  cookies.set(auth.COOKIE_NAME, auth.sign({id: 2, name: 'editor', type: 2}));
  ctx.headers['X-CSRF-Token'] = auth.csrfToken(ctx);
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
});
