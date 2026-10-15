'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
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

test('iframe admin assets require an administrator and use restrictive response headers', async() => {
  const secret = 'plugin-iframe-secret-with-at-least-32-bytes';
  const cookies = new Map();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-iframe-route-'));
  fs.writeFileSync(path.join(root, 'index.html'), '<h1>Plugin</h1>');
  global.firekylin = {plugins: {
    plugins: new Map([['demo', {root}]]),
    routes: {match: () => null},
    admin: {
      iframeAsset: () => ({path: path.join(root, 'index.html'), entry: true})
    }
  }};
  global.think = {model: () => ({async getOptions() { return {jwt_secret: secret} }})};
  const headers = {};
  const ctx = {
    method: 'GET', path: '/admin/api/plugins/demo/pages/custom/iframe/', state: {}, headers: {},
    get(name) { return this.headers[name] || '' },
    set(name, value) { headers[name] = value },
    cookie(name) { return cookies.get(name) },
    throw(status, message) { throw Object.assign(new Error(message), {status}) }
  };
  const middleware = pluginRoutes();
  await assert.rejects(middleware(ctx, () => {}), {status: 403});
  cookies.set(auth.COOKIE_NAME, auth.sign({id: 1, name: 'admin', type: 1}, secret));
  await middleware(ctx, () => {});
  assert.equal(ctx.type, 'text/html; charset=utf-8');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.match(headers['Content-Security-Policy'], /connect-src 'none'/);
  assert.ok(ctx.body instanceof fs.ReadStream);
  ctx.body.destroy();
});
