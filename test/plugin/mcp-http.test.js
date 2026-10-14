'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const {spawn} = require('node:child_process');
const {createRequire} = require('node:module');
const {createProject} = require('../../lib/cli');
const {base64url} = require('../../src/mcp/oauth-utils');
const Database = createRequire(require.resolve('think-model-sqlite'))('better-sqlite3');

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  process.kill(-child.pid, 'SIGTERM');
  await exited;
}

test('live ThinkJS OAuth login, consent, MCP calls, refresh and revocation survive restart', {timeout: 60000}, async() => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-mcp-http-'));
  const port = await freePort();
  const origin = 'http://127.0.0.1:' + port;
  const password = crypto.randomBytes(32).toString('hex');
  let child;
  let db;
  let startupLog = '';
  async function start() {
    child = spawn(process.execPath, [path.resolve(__dirname, '../../bin/firekylin.js')], {
      cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: {...process.env, FIREKYLIN_PROJECT_PATH: root}
    });
    child.stdout.on('data', chunk => {startupLog = (startupLog + chunk.toString()).slice(-4000)});
    child.stderr.on('data', chunk => {startupLog = (startupLog + chunk.toString()).slice(-4000)});
    for (let count = 0; count < 150; count++) {
      try {
        const response = await fetch(origin + '/.well-known/oauth-authorization-server');
        if (response.status === 200) return;
      } catch {}
      if (child.exitCode !== null) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('ThinkJS failed to start: ' + startupLog);
  }
  const form = body => ({method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams(body), redirect: 'manual'});
  try {
    await createProject(root, {nonInteractive: true, skipInstall: true, dbType: 'sqlite',
      dbPath: 'data/firekylin.sqlite', dbPrefix: 'fk_', siteTitle: 'MCP test', siteUrl: origin,
      adminUser: 'admin', adminPassword: password, adminEmail: 'admin@example.com', packageManager: 'npm'});
    const configPath = path.join(root, 'firekylin.config.js');
    const config = require(configPath);
    config.server = {host: '127.0.0.1', port, proxy: false};
    fs.writeFileSync(configPath, 'module.exports = ' + JSON.stringify(config));
    db = new Database(path.join(root, 'data/firekylin.sqlite'));
    await start();
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='fk_mcp_oauth_grant'").get().name,
      'fk_mcp_oauth_grant');
    const registration = await fetch(origin + '/oauth/register', {method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({client_name: 'Integration', redirect_uris: ['http://127.0.0.1:4000/callback']})});
    assert.equal(registration.status, 201);
    const client = await registration.json();
    const verifier = crypto.randomBytes(48).toString('base64url');
    const params = {client_id: client.client_id, redirect_uri: client.redirect_uris[0], response_type: 'code',
      code_challenge: base64url(verifier), code_challenge_method: 'S256', scope: 'posts:read',
      resource: origin + '/mcp', state: 'regression'};
    const authorizationUrl = origin + '/oauth/authorize?' + new URLSearchParams(params);
    const loginRedirect = await fetch(authorizationUrl, {redirect: 'manual'});
    assert.equal(loginRedirect.status, 302);
    assert.match(loginRedirect.headers.get('location'), /\/admin\/login\?redirect=/);
    const salt = db.prepare("SELECT value FROM fk_options WHERE key='password_salt'").get().value;
    const login = await fetch(origin + '/admin/user/login', form({username: 'admin',
      password: crypto.createHash('md5').update(salt + password).digest('hex')}));
    assert.equal((await login.json()).errno, 0);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.match(cookie, /^thinkjs=/);
    const consent = await fetch(authorizationUrl, {headers: {cookie}});
    assert.equal(consent.status, 200);
    const csrf = /name="csrf" value="([^"<>]+)"/.exec(await consent.text())[1];
    await stop(child);
    await start();
    const approved = await fetch(origin + '/oauth/authorize', {...form({...params, csrf, decision: 'allow'}),
      headers: {...form({}).headers, cookie}});
    assert.equal(approved.status, 302);
    const code = new URL(approved.headers.get('location')).searchParams.get('code');
    assert.ok(code);
    const requestTokens = () => fetch(origin + '/oauth/token', form({grant_type: 'authorization_code',
      client_id: client.client_id, redirect_uri: params.redirect_uri, resource: params.resource,
      code, code_verifier: verifier}));
    const exchanged = await requestTokens();
    assert.equal(exchanged.status, 200);
    const tokens = await exchanged.json();
    assert.equal((await requestTokens()).status, 400);
    async function mcp(method, args, token = tokens.access_token) {
      const response = await fetch(origin + '/mcp', {method: 'POST', headers: {
        authorization: 'Bearer ' + token, accept: 'application/json, text/event-stream',
        'content-type': 'application/json', 'mcp-protocol-version': '2025-11-25'
      }, body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params: args})});
      if (response.status !== 200) return {status: response.status};
      const text = await response.text();
      const payload = text.startsWith('event:') || text.startsWith('data:')
        ? text.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('') : text;
      return JSON.parse(payload);
    }
    assert.equal((await mcp('initialize', {protocolVersion: '2025-11-25', capabilities: {},
      clientInfo: {name: 'integration', version: '1'}})).result.serverInfo.name, 'firekylin');
    assert.deepEqual((await mcp('tools/list', {})).result.tools.map(tool => tool.name),
      ['posts.list', 'posts.get', 'posts.search']);
    const listed = await mcp('tools/call', {name: 'posts.list', arguments: {limit: 1}});
    assert.equal(JSON.parse(listed.result.content[0].text).length, 1);
    const refresh = await fetch(origin + '/oauth/token', form({grant_type: 'refresh_token',
      client_id: client.client_id, resource: params.resource, refresh_token: tokens.refresh_token}));
    assert.equal(refresh.status, 200);
    const refreshed = await refresh.json();
    assert.equal((await fetch(origin + '/oauth/token', form({grant_type: 'refresh_token',
      client_id: client.client_id, resource: params.resource, refresh_token: tokens.refresh_token}))).status, 400);
    await fetch(origin + '/oauth/revoke', form({token: refreshed.access_token}));
    assert.equal((await mcp('tools/list', {}, refreshed.access_token)).status, 401);
    db.prepare('UPDATE fk_user SET status=2 WHERE id=1').run();
    assert.equal((await mcp('tools/list', {})).status, 401);
  } finally {
    await stop(child);
    if (db) db.close();
    fs.rmSync(root, {recursive: true, force: true});
  }
});
