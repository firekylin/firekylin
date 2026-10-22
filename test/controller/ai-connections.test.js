'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const adminAuth = require('../../src/service/admin-auth');

const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/admin/api/ai-connections.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/ai-connections');
} finally { Module._load = load }

function controller(userType = 1) {
  const secret = 'ai-connection-controller-secret-at-least-32-bytes';
  const cookie = adminAuth.sign({id: 1, name: 'tester', type: userType}, secret);
  const ctx = {
    state: {jwtSecret: secret},
    headers: {},
    get(name) { return this.headers[name] || '' },
    cookie: () => cookie,
    throw(status, message) { throw Object.assign(new Error(message), {status}) }
  };
  const instance = new Controller();
  instance.ctx = ctx;
  instance.userInfo = {id: 1, type: userType};
  instance.success = data => ({errno: 0, data});
  return instance;
}

test('AI connections use the ThinkJS default controller route', () => {
  const routes = require('../../src/config/router');
  const hasExplicitRoute = routes.some(([pattern]) =>
    pattern instanceof RegExp && pattern.test('admin/api/ai-connections'));
  assert.equal(hasExplicitRoute, false);
  const Router = Module.createRequire(require.resolve('thinkjs'))('think-router/router');
  const ctx = {
    path: '/admin/api/ai-connections', method: 'GET',
    app: {modules: [], controllers: {'admin/api/ai-connections': Controller}, routers: []},
    param() {}
  };
  const router = new Router(ctx, () => {}, {
    prefix: ['/'], suffix: ['.html'], enableDefaultRouter: true,
    optimizeHomepageRouter: true, defaultController: 'index', defaultAction: 'index'
  });
  router.run();
  assert.equal(ctx.controller, 'admin/api/ai-connections');
});

test('AI connections controller lists providers and selects or clears the default', async t => {
  const calls = [];
  const previous = global.firekylin;
  t.after(() => { global.firekylin = previous });
  global.firekylin = {plugins: {ai: {
    models: async() => [{id: 'deepseek'}],
    select: async(...args) => calls.push(['select', ...args]),
    clear: async() => calls.push(['clear'])
  }}};
  const instance = controller();
  assert.deepEqual(await instance.getAction(), {errno: 0, data: {providers: [{id: 'deepseek'}]}});
  instance.post = () => ({provider: 'deepseek', model: 'chat'});
  await assert.rejects(instance.postAction(), {status: 403});
  instance.ctx.headers['X-CSRF-Token'] = adminAuth.csrfToken(instance.ctx);
  assert.deepEqual(await instance.postAction(), {errno: 0, data: {message: 'AI 连接已保存'}});
  instance.post = () => ({provider: null});
  await instance.postAction();
  assert.deepEqual(calls, [['select', 'deepseek', 'chat'], ['clear']]);
  instance.post = () => ({});
  await assert.rejects(instance.postAction(), {status: 400});
});

test('AI connections controller requires an administrator', async t => {
  const previous = global.firekylin;
  t.after(() => { global.firekylin = previous });
  global.firekylin = {plugins: {ai: {models: async() => []}}};
  const instance = controller(2);
  await assert.rejects(instance.getAction(), {status: 403});
  await assert.rejects(instance.postAction(), {status: 403});
});
