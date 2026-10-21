'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const ToolRegistry = require('../../src/plugin/tools');

test('ability metadata is discoverable and filters MCP exposure', async() => {
  const registry = new ToolRegistry();
  registry.register({
    name: 'posts.list',
    description: 'List posts',
    inputSchema: {type: 'object', properties: {}},
    requiredPermissions: ['posts:read'],
    expose: {admin: true, mcp: false},
    execute: async(input, context) => ({input, channel: context.channel})
  }, 'core');
  registry.register({
    name: 'posts.public',
    description: 'List public posts',
    execute: () => []
  }, 'core');

  assert.deepEqual(registry.list({channel: 'mcp'}).map(ability => ability.name), ['posts.public']);
  assert.deepEqual(registry.list({channel: 'admin'}).map(ability => ability.name), ['posts.list']);
  assert.equal(registry.get('missing'), null);
  assert.equal(registry.get('posts.list').execute, undefined);
  assert.equal(registry.get('posts.list').expose.admin, true);
  const context = {channel: 'admin', principal: {id: 1}, authorize: () => true};
  assert.deepEqual(await registry.execute('posts.list', {page: 1}, context),
    {input: {page: 1}, channel: 'admin'});
  await assert.rejects(registry.execute('posts.list', {}, {...context, channel: 'mcp'}),
    /not exposed/);
});

test('invalid exposure metadata cannot be registered', () => {
  const registry = new ToolRegistry();
  assert.throws(() => registry.register({
    name: 'bad.expose', description: 'Invalid', expose: {mcp: 'yes'}, execute() {}
  }, 'core'), /Invalid ability exposure/);
});
