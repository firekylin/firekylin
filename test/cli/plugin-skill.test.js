'use strict';

// End-to-end test: a new SQLite project, real login/CSRF, persisted enablement,
// HTTP route and Eta rendering. No existing site or external service is used.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const {once} = require('node:events');
const {createRequire} = require('node:module');
const {spawn} = require('node:child_process');
const test = require('node:test');
const {scaffold: siteScaffold} = require('../../lib/cli');
const {initialize} = require('../../lib/installer');
const {scaffold} = require('../../skills/firekylin/scripts/scaffold-plugin.cjs');

const core = path.resolve(__dirname, '../..');
const version = require('../../package.json').version;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('generated plugin runs in a clean SQLite site with admin enable/disable', {timeout: 90000}, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-skill-site-'));
  let child;
  async function stop() {
    if (!child || child.exitCode !== null) return;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
    try { await exited } finally { clearTimeout(timer) }
  }
  t.after(async () => { await stop(); fs.rmSync(root, {recursive: true, force: true}) });
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const password = crypto.randomBytes(24).toString('hex');
  const {config, statePath} = siteScaffold(root, {
    dbType: 'sqlite', dbPath: 'data/firekylin.sqlite', dbPrefix: 'fk_',
    siteTitle: 'Plugin skill test', siteUrl: base, adminUser: 'skill-admin',
    adminPassword: password, adminEmail: 'skill-test@example.invalid'
  });
  config.server = {host: '127.0.0.1', port, proxy: false};
  config.pluginConfig = {'site-message': {message: '<script>example</script>'}};
  fs.writeFileSync(path.join(root, 'firekylin.config.js'), `module.exports = ${JSON.stringify(config)};`, {mode: 0o600});
  await initialize(root, config, {title: 'Plugin skill test', siteUrl: base,
    username: 'skill-admin', password, email: 'skill-test@example.invalid'});
  fs.unlinkSync(statePath);
  scaffold(path.join(root, 'plugins/site-message'), 'site-message', version);
  const index = path.join(root, 'themes/firekylin/index.eta');
  const messageExpression = `firekylin.plugin['site-message']
    ? await firekylin.plugin['site-message'].message() : null`;
  const snippet = '<% if (skillMessage !== null) { %>' +
    '<aside id="skill-message"><%= skillMessage %></aside><% } %>';
  const template = `<% const skillMessage = ${messageExpression}; %>\n` + fs.readFileSync(index, 'utf8');
  fs.writeFileSync(index, template.replace('<section id="page-index">', '<section id="page-index">' + snippet));
  const DB = createRequire(require.resolve('think-model-sqlite'))('better-sqlite3');
  const db = new DB(path.join(root, 'data/firekylin.sqlite'));
  const salt = db.prepare('SELECT value FROM fk_options WHERE key=\'password_salt\'').get().value;
  db.close();
  const env = {...process.env, HOST: '127.0.0.1', PORT: String(port)};
  for (const key of ['NODE_TEST_CONTEXT', 'FIREKYLIN_PROJECT_PATH', 'VERCEL']) delete env[key];
  let logs = '';
  async function request(url, options = {}) {
    return fetch(base + url, {...options, signal: AbortSignal.timeout(5000)});
  }
  async function start() {
    logs = '';
    child = spawn(process.execPath, [path.join(core, 'bin/firekylin.js')], {
      cwd: root, env, stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', chunk => { logs = (logs + chunk).slice(-12000) });
    child.stderr.on('data', chunk => { logs = (logs + chunk).slice(-12000) });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`Host exited: ${logs}`);
      try {
        const response = await request('/');
        if (response.status === 200) return;
      } catch { /* Retry while the loopback server starts. */ }
      await delay(100);
    }
    throw new Error(`Host did not become usable: ${logs}`);
  }
  await start();
  const route = '/api/plugins/site-message/message';
  assert.equal((await request(route)).status, 404);
  const login = await request('/admin/user/login', {method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username: 'skill-admin',
      password: crypto.createHash('md5').update(salt + password).digest('hex')})
  });
  assert.equal((await login.json()).errno, 0, 'Real admin login succeeds');
  const cookie = login.headers.getSetCookie().find(value => value.startsWith('thinkjs=')).split(';')[0];
  const page = await (await request('/admin', {headers: {Cookie: cookie}})).text();
  const csrf = /csrfToken:\s*"([^"]+)"/.exec(page)?.[1];
  assert.ok(csrf, 'Rendered admin page supplies CSRF token');
  const headers = {'Content-Type': 'application/json', Cookie: cookie, Referer: base + '/admin', 'X-CSRF-Token': csrf};
  const mutation = operation => JSON.stringify({operation, id: 'site-message'});
  const unauthorized = await request('/admin/api/marketplace', {method: 'POST',
    headers: {'Content-Type': 'application/json'}, body: mutation('plugin.enable')});
  assert.notEqual((await unauthorized.json()).errno, 0);
  const noCsrf = await request('/admin/api/marketplace', {method: 'POST',
    headers: {...headers, 'X-CSRF-Token': ''}, body: mutation('plugin.enable')});
  assert.equal(noCsrf.status, 403);
  async function setState(operation) {
    const result = await request('/admin/api/marketplace', {method: 'POST', headers, body: mutation(operation)});
    assert.equal((await result.json()).errno, 0);
    await stop();
    await start();
  }
  await setState('plugin.enable');
  const response = await request(route);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {message: '<script>example</script>'});
  const html = await (await request('/')).text();
  assert.match(html, /<aside id="skill-message">&lt;script&gt;example&lt;\/script&gt;<\/aside>/);
  assert.doesNotMatch(html, /<script>example<\/script>/);
  assert.equal((await request(route, {method: 'POST'})).status, 404);
  await setState('plugin.disable');
  assert.equal((await request(route)).status, 404);
  assert.doesNotMatch(await (await request('/')).text(), /id="skill-message"/);
});
