'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const RouteRegistry = require('../../src/plugin/routes');

test('route registry namespaces plugin routes and extracts params', () => {
  const routes = new RouteRegistry();
  const unregister = routes.register({path: '/refresh/:id', method: 'POST', handler() {}}, 'example');
  const route = routes.match('POST', '/api/plugins/example/refresh/42');
  assert.equal(route.path, '/api/plugins/example/refresh/:id');
  assert.deepEqual(route.names, ['id']);
  unregister();
  assert.equal(routes.match('POST', '/api/plugins/example/refresh/42'), undefined);
});

test('route registry rejects collisions and removes all plugin routes', () => {
  const routes = new RouteRegistry();
  routes.register({path: '/ping', handler() {}}, 'example');
  assert.throws(() => routes.register({path: '/ping', handler() {}}, 'example'), /already registered/);
  routes.removePlugin('example');
  assert.equal(routes.routes.length, 0);
});

test('route registry exposes site routes and supports params with suffixes', () => {
  const routes = new RouteRegistry();
  routes.register({
    path: '/post/:pathname.md',
    method: ['GET', 'HEAD'],
    scope: 'site',
    handler() {}
  }, 'markdown');
  const route = routes.match('GET', '/post/hello-world.md');
  const match = route.regexp.exec('/post/hello-world.md');
  assert.equal(route.path, '/post/:pathname.md');
  assert.equal(route.scope, 'site');
  assert.deepEqual(route.names, ['pathname']);
  assert.equal(match[1], 'hello-world');
  assert.equal(routes.match('HEAD', '/post/hello-world.md'), route);
  assert.equal(routes.match('GET', '/api/plugins/markdown/post/hello-world.md'), undefined);
});

test('route registry rejects unsupported scopes', () => {
  const routes = new RouteRegistry();
  assert.throws(() => routes.register({
    path: '/ping',
    scope: 'global',
    handler() {}
  }, 'example'), /Unsupported plugin route scope/);
});
