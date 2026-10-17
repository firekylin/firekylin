'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const {Readable} = require('node:stream');
const {
  random, digest, base64url, validVerifier, redirectAllowed,
  publicOrigin, escapeHtml
} = require('../../src/mcp/oauth-utils');
const {buildOAuthHandler, authorizable, registrationAllowed} = require('../../src/mcp/oauth');
const {sqlFor, migrateOAuthModels} = require('../../src/mcp/oauth-schema');
const adminAuth = require('../../src/service/admin-auth');
const jwtSecret = 'test-secret-for-oauth-jwt-login-32-bytes';

function fakeStore() {
  let nextClient = 1;
  let nextToken = 1;
  const clients = new Map();
  const grants = new Map();
  return {
    async registerClient({name, redirectUris}) {
      const id = 'fk_' + nextClient++;
      clients.set(id, {id, name, redirectUris});
      return {client_id: id, client_name: name, redirect_uris: redirectUris};
    },
    async client(id) {return clients.get(id) || null},
    async createGrant(kind, fields) {
      const token = 'secret' + nextToken++;
      grants.set(token, {...fields, kind, revoked: false, expires_at: Date.now() + 600000});
      return token;
    },
    async lookup(kind, token) {
      const item = grants.get(token);
      return item && item.kind === kind && !item.revoked ? {
        ...item, client_id: item.clientId, user_id: item.userId,
        scopes: item.scopes.join(' '), parent_hash: item.parent || ''
      } : null;
    },
    async consume(kind, token) {
      const item = await this.lookup(kind, token);
      if (item) grants.get(token).revoked = true;
      return item;
    },
    async revoke(token) { if (grants.has(token)) grants.get(token).revoked = true }
  };
}

function ctx({path, method = 'GET', query = {}, body = {}, user, session, secure = true}) {
  const responseHeaders = {};
  const requestHeaders = {};
  if (method === 'POST') requestHeaders['content-type'] = path === '/oauth/register' ?
    'application/json' : 'application/x-www-form-urlencoded';
  const raw = method === 'POST' && path === '/oauth/register' ?
    JSON.stringify(body) : new URLSearchParams(body).toString();
  return {
    path, method, query, secure, hostname: 'blog.example',
    url: path + '?' + new URLSearchParams(query).toString(),
    req: Readable.from([Buffer.from(raw)]),
    get: name => requestHeaders[name.toLowerCase()] || '',
    set: (name, value) => {responseHeaders[name] = value},
    state: {jwtSecret},
    cookie: () => user ? adminAuth.sign({...user, type: user.type || 1}, jwtSecret) : undefined,
    redirect(value) {this.location = value; this.status = 302},
    responseHeaders
  };
}

test('OAuth PKCE and redirect helpers enforce secure inputs', () => {
  const verifier = 'a'.repeat(43);
  assert.equal(validVerifier(verifier), true);
  assert.equal(base64url(verifier).length, 43);
  assert.equal(redirectAllowed('https://app.example/oauth/callback'), true);
  assert.equal(redirectAllowed('http://localhost:4567/callback'), true);
  assert.equal(redirectAllowed('http://10.0.0.2/callback'), false);
  assert.equal(redirectAllowed('javascript:alert(1)'), false);
  assert.equal(registrationAllowed(['https://app.example/callback']), true);
  assert.equal(registrationAllowed(['http://evil.example/callback']), false);
  assert.equal(publicOrigin('https://blog.example/'), 'https://blog.example');
  assert.throws(() => publicOrigin('http://blog.example'), /secure/);
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(random().length > 32, true);
});

test('OAuth metadata and dynamic client registration', async() => {
  const store = fakeStore();
  const handler = buildOAuthHandler({
    origin: 'https://blog.example', store,
    getUser: async id => ({id, name: 'Admin', status: 1, type: 1})
  });
  const session = {};
  const discovery = ctx({path: '/.well-known/oauth-protected-resource/mcp', session});
  await handler(discovery);
  assert.equal(discovery.body.resource, 'https://blog.example/mcp');
  const as = ctx({path: '/.well-known/oauth-authorization-server', session});
  await handler(as);
  assert.equal(as.body.code_challenge_methods_supported[0], 'S256');
  const input = ctx({path: '/oauth/register', method: 'POST', session, body: {
    client_name: 'Codex',
    redirect_uris: ['http://127.0.0.1:4862/callback']
  }});
  await handler(input);
  assert.equal(input.status, 201);
  assert.match(input.body.client_id, /^fk_/);
});

test('OAuth login consent, code exchange, refresh and replay protection', async() => {
  const store = fakeStore();
  const handler = buildOAuthHandler({
    origin: 'https://blog.example', store,
    getUser: async id => ({id, name: 'Admin', status: 1, type: 1})
  });
  const client = await store.registerClient({
    name: 'Codex', redirectUris: [
      'http://127.0.0.1:4444/callback', 'http://[::1]:4444/callback'
    ]
  });
  const verifier = 'v'.repeat(64);
  const parameters = {
    client_id: client.client_id,
    redirect_uri: 'http://127.0.0.1:4444/callback',
    response_type: 'code', code_challenge: base64url(verifier),
    code_challenge_method: 'S256', resource: 'https://blog.example/mcp',
    scope: 'posts:read posts:write', state: 'random-state'
  };
  const session = {};
  const unauthenticated = ctx({path: '/oauth/authorize', query: parameters, session});
  await handler(unauthenticated);
  assert.match(unauthenticated.location, /^\/admin\/login\?redirect=/);

  const principal = {id: 8, status: 1, type: 1};
  const consent = ctx({path: '/oauth/authorize', query: parameters, session, user: principal});
  await handler(consent);
  assert.match(consent.body, /同意授权/);
  assert.equal(consent.responseHeaders['Content-Security-Policy'],
    'default-src \'none\'; style-src \'unsafe-inline\'; ' +
    'form-action \'self\' http://127.0.0.1:4444; base-uri \'none\'; frame-ancestors \'none\'');
  const ipv6Consent = ctx({path: '/oauth/authorize', query: {
    ...parameters, redirect_uri: 'http://[::1]:4444/callback', state: 'ipv6-state'
  }, session, user: principal});
  await handler(ipv6Consent);
  assert.equal(ipv6Consent.responseHeaders['Content-Security-Policy'],
    'default-src \'none\'; style-src \'unsafe-inline\'; ' +
    'base-uri \'none\'; frame-ancestors \'none\'');
  const csrf = /name="csrf" value="([^"<>]+)"/.exec(consent.body)[1];

  const approved = ctx({
    path: '/oauth/authorize', method: 'POST', session, user: principal,
    body: {...parameters, csrf, decision: 'allow'}
  });
  await handler(approved);
  const url = new URL(approved.location);
  const code = url.searchParams.get('code');
  assert.equal(url.searchParams.get('state'), 'random-state');
  assert.equal(url.searchParams.get('iss'), 'https://blog.example');
  assert.ok(code);

  const tokenBody = {
    grant_type: 'authorization_code', client_id: client.client_id,
    redirect_uri: parameters.redirect_uri, resource: parameters.resource,
    code, code_verifier: verifier
  };
  const incorrectVerifier = ctx({path: '/oauth/token', method: 'POST', session,
    body: {...tokenBody, code_verifier: 'x'.repeat(64)}});
  await handler(incorrectVerifier);
  assert.equal(incorrectVerifier.body.error, 'invalid_grant');
  const incorrectRedirect = ctx({path: '/oauth/token', method: 'POST', session,
    body: {...tokenBody, redirect_uri: 'http://127.0.0.1:9999/callback'}});
  await handler(incorrectRedirect);
  assert.equal(incorrectRedirect.body.error, 'invalid_grant');

  const first = ctx({path: '/oauth/token', method: 'POST', session, body: tokenBody});
  await handler(first);
  assert.equal(first.status, 200);
  assert.match(first.body.access_token, /^secret/);
  assert.equal(first.body.token_type, 'Bearer');
  assert.ok(first.body.refresh_token);
  const replay = ctx({path: '/oauth/token', method: 'POST', session, body: tokenBody});
  await handler(replay);
  assert.equal(replay.body.error, 'invalid_grant');

  const refresh = ctx({path: '/oauth/token', method: 'POST', session, body: {
    grant_type: 'refresh_token', client_id: client.client_id,
    resource: parameters.resource, refresh_token: first.body.refresh_token
  }});
  await handler(refresh);
  assert.equal(refresh.status, 200);
  const oldRefresh = ctx({path: '/oauth/token', method: 'POST', session, body: {
    grant_type: 'refresh_token', client_id: client.client_id,
    resource: parameters.resource, refresh_token: first.body.refresh_token
  }});
  await handler(oldRefresh);
  assert.equal(oldRefresh.body.error, 'invalid_grant');
});

test('CSRF mismatch, denied permission and incorrect client callback do not issue grants', async() => {
  const store = fakeStore();
  const handler = buildOAuthHandler({
    origin: 'https://blog.example', store,
    getUser: async id => ({id, name: 'Editor', status: 1, type: 2})
  });
  const client = await store.registerClient({
    name: 'Client', redirectUris: ['https://client.example/cb']
  });
  const session = {};
  const parameters = {
    client_id: client.client_id, redirect_uri: 'https://client.example/cb',
    response_type: 'code', code_challenge: base64url('k'.repeat(64)),
    code_challenge_method: 'S256', resource: 'https://blog.example/mcp',
    scope: 'posts:read', state: 'abc'
  };
  const first = ctx({path: '/oauth/authorize', query: parameters, user: {id: 2}, session});
  await handler(first);
  const request = ctx({path: '/oauth/authorize', method: 'POST', session, user: {id: 2},
    body: {...parameters, decision: 'allow', csrf: 'wrong'}});
  await handler(request);
  assert.equal(request.status, 403);
  assert.equal(request.body.error, 'invalid_request');

  const adminScope = ctx({path: '/oauth/authorize', query: {...parameters, scope: 'posts:delete'},
    user: {id: 2}, session});
  await handler(adminScope);
  assert.equal(adminScope.status, 403);

  const badRedirect = ctx({path: '/oauth/authorize', query: {...parameters, redirect_uri: 'https://evil.example/cb'},
    user: {id: 2}, session});
  await handler(badRedirect);
  assert.equal(badRedirect.body.error, 'invalid_client');
});

test('OAuth SQL migration has portable client and credential tables', () => {
  for (const type of ['sqlite', 'mysql', 'postgresql']) {
    const sql = sqlFor(type, 'fk_');
    assert.equal(sql.length, 2);
    assert.ok(sql.every(line => /CREATE TABLE IF NOT EXISTS fk_mcp_oauth_/.test(line)));
    assert.ok(sql.some(line => /token_hash/.test(line)));
  }
  assert.equal(authorizable(['posts:read'], {type: 2}), true);
  assert.equal(authorizable(['comments:moderate'], {type: 2}), false);
});


test('TiDB uses the MySQL dialect and migrations preserve empty prefixes', async() => {
  for (const type of ['sqlite', 'mysql', 'tidb', 'postgresql']) {
    const queries = [];
    await migrateOAuthModels({model: {query: async sql => queries.push(sql)}, config: {type, [type]: {prefix: ''}}});
    assert.ok(queries.every(sql => /CREATE TABLE IF NOT EXISTS mcp_oauth_/.test(sql)));
    if (type === 'tidb') assert.deepEqual(queries, sqlFor('mysql', ''));
  }
});

test('JWT consent is persistent, bound to user/request, and one-time', async() => {
  const store = fakeStore();
  const build = () => buildOAuthHandler({origin: 'https://blog.example', store,
    getUser: async id => ({id, type: 1, status: 1})});
  const client = await store.registerClient({name: 'Client', redirectUris: ['https://client.example/cb']});
  const params = {client_id: client.client_id, redirect_uri: 'https://client.example/cb', response_type: 'code',
    code_challenge: base64url('v'.repeat(64)), code_challenge_method: 'S256',
    resource: 'https://blog.example/mcp', scope: 'posts:read', state: 'test'};
  const page = ctx({path: '/oauth/authorize', query: params, user: {id: 1}});
  await build()(page);
  assert.equal(page.session, undefined);
  const csrf = /name="csrf" value="([^"<>]+)"/.exec(page.body)[1];
  const wrong = ctx({path: '/oauth/authorize', method: 'POST', user: {id: 2}, body: {...params, csrf, decision: 'allow'}});
  await build()(wrong);
  assert.equal(wrong.status, 403);
  const fresh = ctx({path: '/oauth/authorize', query: params, user: {id: 1}});
  await build()(fresh);
  const valid = /name="csrf" value="([^"<>]+)"/.exec(fresh.body)[1];
  const post = () => ctx({path: '/oauth/authorize', method: 'POST', user: {id: 1}, body: {...params, csrf: valid, decision: 'allow'}});
  const accepted = post();
  await build()(accepted);
  assert.equal(accepted.status, 302);
  const replay = post();
  await build()(replay);
  assert.equal(replay.status, 403);
});


test('spoofed loopback Host cannot bypass HTTPS on a public OAuth issuer', async() => {
  const handler = buildOAuthHandler({origin: 'https://blog.example', store: fakeStore(), getUser: async() => null});
  const request = ctx({path: '/oauth/register', method: 'POST', secure: false});
  request.hostname = 'localhost';
  await handler(request);
  assert.equal(request.status, 403);
});
