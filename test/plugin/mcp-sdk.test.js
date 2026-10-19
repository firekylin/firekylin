'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {Readable} = require('node:stream');
const ToolRegistry = require('../../src/plugin/tools');
const {createMcpEndpoint} = require('../../src/mcp/server');
const sdk = require('@modelcontextprotocol/server');

test('real MCP SDK handles initialization, discovery, calls and schema validation', async() => {
  const token = 'a'.repeat(64);
  const tools = new ToolRegistry();
  let executions = 0;
  tools.register({name: 'posts.get', description: 'Read', requiredPermissions: ['posts:read'],
    inputSchema: {type: 'object', properties: {id: {type: 'integer', minimum: 1}}, required: ['id']},
    execute(input) {executions++; return {id: input.id}}
  }, 'test');
  tools.register({name: 'posts.publish', description: 'Publish', requiredPermissions: ['posts:read'],
    inputSchema: {type: 'object', properties: {id: {type: 'integer', minimum: 1}}, required: ['id']},
    requiresApproval: true, execute(input) {return {id: input.id, published: true}}
  }, 'test');
  const endpoint = await createMcpEndpoint({sdk, tools, config: {requireHttps: false},
    verifier: async authorization => authorization === 'Bearer ' + token ? {
      principal: {id: 1, type: 1}, scopes: new Set(['posts:read']), tokenId: 'test'
    } : null, logger: {info() {}, error() {}}});
  async function call(method, params, id) {
    const headers = {'content-type': 'application/json', accept: 'application/json, text/event-stream',
      authorization: 'Bearer ' + token, 'mcp-protocol-version': '2025-11-25'};
    const ctx = {method: 'POST', secure: false,
      req: Readable.from([Buffer.from(JSON.stringify({jsonrpc: '2.0', id, method, params}))]),
      get: name => headers[name] || '', set() {}};
    await endpoint(ctx);
    assert.equal(ctx.status, 200);
    let body = '';
    for await (const chunk of ctx.body) body += chunk.toString();
    const data = body.startsWith('event:') || body.startsWith('data:')
      ? body.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('') : body;
    return JSON.parse(data);
  }
  const initialized = await call('initialize', {protocolVersion: '2025-11-25',
    capabilities: {}, clientInfo: {name: 'regression', version: '1.0.0'}}, 1);
  assert.equal(initialized.result.serverInfo.name, 'firekylin');
  const listed = await call('tools/list', {}, 2);
  assert.deepEqual(listed.result.tools.map(tool => tool.name), ['posts.get', 'posts.publish']);
  const publish = listed.result.tools.find(tool => tool.name === 'posts.publish');
  assert.deepEqual(publish.inputSchema.required, ['id', 'confirm']);
  const result = await call('tools/call', {name: 'posts.get', arguments: {id: 7}}, 3);
  assert.deepEqual(JSON.parse(result.result.content[0].text), {id: 7});
  const invalid = await call('tools/call', {name: 'posts.get', arguments: {id: 'invalid'}}, 4);
  assert.ok(invalid.error || invalid.result.isError);
  assert.equal(executions, 1);
  const published = await call('tools/call', {name: 'posts.publish', arguments: {id: 8, confirm: true}}, 5);
  assert.deepEqual(JSON.parse(published.result.content[0].text), {id: 8, published: true});
});
