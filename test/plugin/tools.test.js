'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const ToolRegistry = require('../../src/plugin/tools');
const {PluginManager} = require('../../src/plugin/manager');

test('authorized tools execute and metadata excludes executor', async() => {
  const registry = new ToolRegistry();
  registry.register({
    name: 'posts.get',
    description: 'Get a post',
    requiredPermissions: ['posts:read'],
    execute: (input, context) => ({id: input.id, principal: context.principal})
  }, 'sample');
  assert.equal(registry.list()[0].execute, undefined);
  assert.deepEqual(await registry.execute('posts.get', {id: 4}, {
    principal: 'admin', authorize: permission => permission === 'posts:read'
  }), {id: 4, principal: 'admin'});
});

test('unknown, duplicated, unauthorized and unloaded tools cannot run', async() => {
  const registry = new ToolRegistry();
  let called = false;
  const definition = {
    name: 'posts.publish', description: 'Publish post',
    requiredPermissions: ['posts:publish'],
    execute: () => { called = true; }
  };
  registry.register(definition, 'sample');
  assert.throws(() => registry.register(definition, 'other'), /Duplicate tool/);
  await assert.rejects(registry.execute('posts.publish', {}), /Authorization callback/);
  await assert.rejects(registry.execute('posts.publish', {}, {authorize: () => false}), /Permission denied/);
  assert.equal(called, false);
  registry.removePlugin('sample');
  await assert.rejects(registry.execute('posts.publish', {}, {authorize: () => true}), /Unknown tool/);
});

test('manager unregisters plugin-owned tools on deactivation', async() => {
  const manager = new PluginManager({logger: {error() {}, info() {}}});
  const record = {
    manifest: {id: 'example', version: '1.0.0'},
    root: process.cwd(),
    status: 'discovered',
    plugin: {
      register(ctx) {
        ctx.tools.register({name: 'example.ping', description: 'Ping', execute: () => 'pong'});
      }
    }
  };
  manager.plugins.set('example', record);
  await manager.activate(record);
  assert.deepEqual(manager.tools.list().map(item => item.name), ['example.ping']);
  await manager.deactivate('example');
  assert.deepEqual(manager.tools.list(), []);
});
