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
