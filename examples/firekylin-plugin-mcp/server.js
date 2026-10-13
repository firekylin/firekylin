'use strict';

const {Readable} = require('node:stream');
const {createTokenVerifier, isAllowedOrigin} = require('./auth');

const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
const ALLOWED_METHODS = new Set(['POST', 'GET', 'DELETE']);

async function readBody(req, limit = MAX_REQUEST_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) {
      const error = new Error('Request body too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function exposedTools(tools, scopes) {
  return tools.filter(tool => !tool.requiresApproval &&
    tool.requiredPermissions.every(permission => scopes.has(permission)));
}

function createServerFactory({tools, auth, sdk, logger}) {
  const {McpServer, fromJsonSchema} = sdk;
  return () => {
    const server = new McpServer({name: 'firekylin', version: '1.0.0'});
    for (const tool of exposedTools(tools.list(), auth.scopes)) {
      server.registerTool(tool.name, {
        description: tool.description,
        inputSchema: fromJsonSchema(tool.inputSchema || {type: 'object', properties: {}, additionalProperties: false})
      }, async input => {
        const started = Date.now();
        try {
          const value = await tools.execute(tool.name, input, {
            principal: auth.principal,
            authorize: permission => auth.scopes.has(permission)
            // No approve callback: high-risk tools are strictly disabled.
          });
          logger.info?.('[mcp] ' + JSON.stringify({
            action: tool.name, tokenId: auth.tokenId,
            userId: auth.principal.id, ok: true, durationMs: Date.now() - started
          }));
          return {content: [{type: 'text', text: JSON.stringify(value === undefined ? null : value)}]};
        } catch (error) {
          logger.error?.('[mcp] ' + JSON.stringify({
            action: tool.name, tokenId: auth.tokenId,
            userId: auth.principal.id, ok: false, durationMs: Date.now() - started,
            error: error.message
          }));
          return {content: [{type: 'text', text: 'Tool execution failed or access denied'}], isError: true};
        }
      });
    }
    return server;
  };
}

async function createMcpEndpoint({tools, config = {}, getUser, logger = console, sdk: sdkOverride}) {
  const sdk = sdkOverride || await import('@modelcontextprotocol/server');
  const verify = createTokenVerifier(config, getUser);
  return async function handle(ctx) {
    if (!ALLOWED_METHODS.has(ctx.method)) {
      ctx.set('Allow', 'POST, GET, DELETE');
      ctx.status = 405;
      return;
    }
    if (!isAllowedOrigin(ctx.get('origin'), config.allowedOrigins)) {
      ctx.status = 403;
      ctx.body = 'Origin not allowed';
      return;
    }
    // Never expose the MCP endpoint without a configured bearer token.
    const auth = await verify(ctx.get('authorization'));
    if (!auth) {
      ctx.set('WWW-Authenticate', 'Bearer realm="firekylin-mcp"');
      ctx.status = 401;
      ctx.body = 'Unauthorized';
      return;
    }
    if (config.requireHttps !== false && !ctx.secure) {
      ctx.status = 403;
      ctx.body = 'HTTPS required';
      return;
    }
    if (ctx.method === 'POST' && !String(ctx.get('content-type')).toLowerCase().startsWith('application/json')) {
      ctx.status = 415;
      ctx.body = 'Expected JSON content type';
      return;
    }

    let rawBody;
    try {
      rawBody = ctx.method === 'POST' ? await readBody(ctx.req) : undefined;
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = 'Invalid request body';
      return;
    }

    const {createMcpHandler} = sdk;
    const handler = createMcpHandler(createServerFactory({tools, auth, sdk, logger}));
    const headers = new Headers();
    for (const name of ['accept', 'content-type', 'mcp-protocol-version', 'mcp-method', 'mcp-name', 'mcp-session-id']) {
      const value = ctx.get(name);
      if (value) headers.set(name, value);
    }
    const request = new Request('https://firekylin.invalid/mcp', {
      method: ctx.method,
      headers,
      ...(rawBody ? {body: rawBody} : {})
    });
    const response = await handler.fetch(request);
    ctx.status = response.status;
    for (const name of ['content-type', 'cache-control', 'mcp-protocol-version', 'mcp-session-id', 'allow']) {
      const value = response.headers.get(name);
      if (value) ctx.set(name, value);
    }
    // Support both JSON and SSE; do not buffer an infinite stream.
    ctx.body = response.body ? Readable.fromWeb(response.body) : '';
  };
}

module.exports = {createMcpEndpoint, createServerFactory, exposedTools, readBody};
