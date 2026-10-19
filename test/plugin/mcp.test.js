'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {Readable} = require('node:stream');
const {isAllowedOrigin} = require('../../src/mcp/oauth-auth');
const {exposedTools, remoteInputSchema, createServerFactory, createMcpEndpoint, readBody} = require('../../src/mcp/server');

test('Origin headers are rejected unless explicitly allowed', () => {
  assert.equal(isAllowedOrigin(undefined, []), true);
  assert.equal(isAllowedOrigin('https://site.example', []), false);
  assert.equal(isAllowedOrigin('https://site.example', ['https://site.example']), true);
  assert.equal(isAllowedOrigin('https://evil.example', ['https://site.example']), false);
});

test('MCP advertises scoped tools and adds explicit confirmation to approval-gated tools', () => {
  const tools = [
    {name: 'posts.list', requiredPermissions: ['posts:read'], requiresApproval: false},
    {name: 'posts.create_draft', requiredPermissions: ['posts:write'], requiresApproval: false},
    {name: 'posts.publish', requiredPermissions: ['posts:publish'], requiresApproval: true}
  ];
  assert.deepEqual(exposedTools(tools, new Set(['posts:read'])).map(tool => tool.name), ['posts.list']);
  assert.deepEqual(exposedTools(tools, new Set(['posts:read', 'posts:write', 'posts:publish']))
    .map(tool => tool.name), ['posts.list', 'posts.create_draft', 'posts.publish']);
  const schema = remoteInputSchema({...tools[2], inputSchema: {type: 'object', properties: {id: {type: 'integer'}}, required: ['id']}});
  assert.deepEqual(schema.required, ['id', 'confirm']);
  assert.equal(schema.properties.confirm.const, true);
});

test('approval-gated remote tools require confirm=true and do not forward it', async() => {
  const registered = new Map();
  class FakeMcpServer { registerTool(name, descriptor, cb) {registered.set(name, {descriptor, cb})} }
  let executed;
  const factory = createServerFactory({
    sdk: {McpServer: FakeMcpServer, fromJsonSchema: schema => schema},
    auth: {principal: {id: 1, type: 1}, scopes: new Set(['posts:delete']), tokenId: 'token'},
    logger: {info() {}, error() {}},
    tools: {
      list: () => [{name: 'posts.delete', description: 'Delete', requiredPermissions: ['posts:delete'],
        inputSchema: {type: 'object', properties: {id: {type: 'integer'}}, required: ['id']}, requiresApproval: true}],
      async execute(name, input, context) { executed = {name, input, approved: await context.approve()}; return executed }
    }
  });
  factory();
  const response = await registered.get('posts.delete').cb({id: 9, confirm: true});
  assert.deepEqual(JSON.parse(response.content[0].text), {name: 'posts.delete', input: {id: 9}, approved: true});
});

test('registered Tool execution uses scoped OAuth identity', async() => {
  const registered = new Map();
  class FakeMcpServer {
    registerTool(name, descriptor, cb) {registered.set(name, {descriptor, cb})}
  }
  const auth = {principal: {id: 3, type: 2}, scopes: new Set(['posts:read']), tokenId: 'oauth-demo'};
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
  const response = await registered.get('posts.get').cb({id: 5});
  assert.equal(JSON.parse(response.content[0].text).id, 5);
});

test('OAuth verifier is mandatory and unauthorized MCP requests advertise discovery', async() => {
  await assert.rejects(createMcpEndpoint({sdk: {}}), /OAuth token verifier/);
  const sdk = {
    McpServer: class {registerTool() {}},
    fromJsonSchema: schema => schema,
    createMcpHandler(factory) {
      factory();
      return {fetch: async request => new Response(JSON.stringify({jsonrpc: '2.0', id: 1, result: {ok: true}}), {
        headers: {'content-type': 'application/json'}
      })};
    }
  };
  const endpoint = await createMcpEndpoint({
    sdk, verifier: async header => header === 'Bearer valid' ? {
      principal: {id: 7, type: 1}, scopes: new Set(['posts:read']), tokenId: 't1'
    } : null,
    resourceMetadataUrl: 'https://blog.example/.well-known/oauth-protected-resource/mcp',
    config: {requireHttps: false},
    tools: {list: () => []}
  });
  function context(auth) {
    const requestHeaders = {authorization: auth, 'content-type': 'application/json', accept: 'application/json'};
    const outputHeaders = {};
    return {
      method: 'POST', secure: false,
      req: Readable.from([Buffer.from('{"jsonrpc":"2.0","id":1,"method":"initialize"}')]),
      get: name => requestHeaders[name.toLowerCase()] || '',
      set: (name, value) => {outputHeaders[name] = value},
      outputHeaders
    };
  }
  const denied = context('');
  await endpoint(denied);
  assert.equal(denied.status, 401);
  assert.match(denied.outputHeaders['WWW-Authenticate'], /resource_metadata="https:/);
  const allowed = context('Bearer valid');
  await endpoint(allowed);
  assert.equal(allowed.status, 200);
  let body = '';
  for await (const chunk of allowed.body) body += chunk.toString();
  assert.equal(JSON.parse(body).result.ok, true);
});

test('body reader enforces request size limits', async() => {
  await assert.rejects(readBody(Readable.from([Buffer.alloc(10)]), 5), /too large/);
  assert.equal((await readBody(Readable.from([Buffer.from('hello')]), 10)).toString(), 'hello');
});


test('spoofed loopback Host cannot bypass HTTPS for a public MCP resource', async() => {
  const endpoint = await createMcpEndpoint({sdk: {}, tools: {},
    verifier: async() => ({principal: {id: 1}, scopes: new Set()}),
    resourceMetadataUrl: 'https://blog.example/.well-known/oauth-protected-resource/mcp'});
  const ctx = {method: 'POST', secure: false, hostname: 'localhost', get: () => '', set() {}};
  await endpoint(ctx);
  assert.equal(ctx.status, 403);
});
