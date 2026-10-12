'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const {createTokenVerifier, isAllowedOrigin} = require('../../examples/firekylin-plugin-mcp/auth');
const {exposedTools, createServerFactory, readBody} = require('../../examples/firekylin-plugin-mcp/server');
const {Readable} = require('node:stream');

function hash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

test('MCP bearer token maps to a live active Firekylin user with explicit scopes', async() => {
  const token = 'f'.repeat(64);
  const verify = createTokenVerifier({
    tokens: [{sha256: hash(token), userId: 3, scopes: ['posts:read']}]
  }, async id => ({id, type: 2, status: 1}));
  const auth = await verify('Bearer ' + token);
  assert.equal(auth.principal.id, 3);
  assert.equal(auth.principal.type, 2);
  assert.equal(auth.scopes.has('posts:read'), true);
  assert.equal(await verify('Bearer ' + 'a'.repeat(64)), null);
  assert.equal(await verify('Basic ' + token), null);
  assert.equal(await verify('Bearer ' + token.slice(0, 8)), null);
});

test('disabled users and invalid scopes cannot authenticate', async() => {
  const token = 'a'.repeat(64);
  const verify = createTokenVerifier({tokens: [
    {sha256: hash(token), userId: 3, scopes: ['posts:read']}
  ]}, async id => ({id, status: 0}));
  assert.equal(await verify('Bearer ' + token), null);
});

test('Origin headers are rejected unless explicitly allowed', () => {
  assert.equal(isAllowedOrigin(undefined, []), true);
  assert.equal(isAllowedOrigin('https://site.example', []), false);
  assert.equal(isAllowedOrigin('https://site.example', ['https://site.example']), true);
  assert.equal(isAllowedOrigin('https://evil.example', ['https://site.example']), false);
});

test('MCP only advertises authorized tools and never approval-gated tools', () => {
  const tools = [
    {name: 'posts.list', requiredPermissions: ['posts:read'], requiresApproval: false},
    {name: 'posts.createDraft', requiredPermissions: ['posts:write'], requiresApproval: false},
    {name: 'posts.publish', requiredPermissions: ['posts:publish'], requiresApproval: true}
  ];
  assert.deepEqual(exposedTools(tools, new Set(['posts:read'])).map(tool => tool.name), ['posts.list']);
  assert.deepEqual(exposedTools(tools, new Set(['posts:read', 'posts:write', 'posts:publish']))
    .map(tool => tool.name), ['posts.list', 'posts.createDraft']);
});

test('tool registration and execution are backed by Tool Registry with safe error output', async() => {
  const registered = new Map();
  class FakeMcpServer {
    registerTool(name, descriptor, cb) {registered.set(name, {descriptor, cb})}
  }
  const auth = {principal: {id: 3, type: 2}, scopes: new Set(['posts:read']), tokenId: 'demo'};
  const factory = createServerFactory({
    sdk: {McpServer: FakeMcpServer, fromJsonSchema: schema => schema},
    auth, logger: {info() {}, error() {}},
    tools: {
      list: () => [{name: 'posts.get', description: 'Read', requiredPermissions: ['posts:read'],
        inputSchema: {type: 'object'}, requiresApproval: false}],
      execute: async(name, input, context) => {
        assert.equal(await context.authorize('posts:read'), true);
        assert.equal(context.principal.id, 3);
        return {id: input.id};
      }
    }
  });
  factory();
  assert.equal(registered.has('posts.get'), true);
  const response = await registered.get('posts.get').cb({id: 5});
  assert.equal(JSON.parse(response.content[0].text).id, 5);
});

test('body reader enforces request size limits', async() => {
  await assert.rejects(readBody(Readable.from([Buffer.alloc(10)]), 5), /too large/);
  const value = await readBody(Readable.from([Buffer.from('hello')]), 10);
  assert.equal(value.toString(), 'hello');
});
