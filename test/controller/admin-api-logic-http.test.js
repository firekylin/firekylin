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
const auth = require('../../src/service/admin-auth');

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

test('live REST routing runs authorization logic before business controllers', {timeout: 60000}, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-admin-api-'));
  const origin = 'http://127.0.0.1:' + await freePort();
  let child;
  let db;
  let startupLog = '';
  try {
    await createProject(root, {nonInteractive: true, skipInstall: true, dbType: 'sqlite',
      dbPath: 'data/firekylin.sqlite', dbPrefix: 'fk_', siteTitle: 'Authorization test', siteUrl: origin,
      adminUser: 'admin', adminPassword: crypto.randomBytes(32).toString('hex'),
      adminEmail: 'admin@example.invalid', packageManager: 'npm'});
    const configPath = path.join(root, 'firekylin.config.js');
    const config = require(configPath);
    config.server = {host: '127.0.0.1', port: Number(new URL(origin).port), proxy: false};
    fs.writeFileSync(configPath, 'module.exports = ' + JSON.stringify(config));
    // Optional OAuth/update lookups must never contact real services in this test.
    const preload = path.join(root, 'offline.cjs');
    fs.writeFileSync(preload, 'global.fetch = async() => {throw new Error(\'External fetch disabled in test\')};\n');
    db = new Database(path.join(root, 'data/firekylin.sqlite'));
    const insertUser = db.prepare(`INSERT INTO fk_user
      (id, name, display_name, email, type, status, create_time, last_login_time, app_key, app_secret)
      VALUES (?, ?, ?, ?, ?, 1, '2026-01-01', '2026-01-01', 'synthetic-key', 'synthetic-user-secret')`);
    insertUser.run(2, 'editor', 'Editor', 'editor@example.invalid', 2);
    insertUser.run(3, 'commenter', 'Commenter', 'commenter@example.invalid', 4);
    const setOption = db.prepare('INSERT OR REPLACE INTO fk_options (key, value) VALUES (?, ?)');
    setOption.run('two_factor_auth', 'A'.repeat(32));
    setOption.run('push_sites', JSON.stringify({remote: {
      appKey: 'synthetic-key', appSecret: 'synthetic-push-secret'
    }}));
    setOption.run('upload', JSON.stringify({type: 'local', secret: 'synthetic-upload-secret'}));
    setOption.run('defaultCategory', '8');
    const secret = crypto.randomBytes(32).toString('hex');
    setOption.run('jwt_secret', secret);
    const tokens = {
      admin: auth.sign({id: 1, type: 1}, secret),
      editor: auth.sign({id: 2, type: 2}, secret),
      commenter: auth.sign({id: 3, type: 4}, secret)
    };
    child = spawn(process.execPath, ['--require', preload, path.resolve(__dirname, '../../bin/firekylin.js')], {
      cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: {...process.env, FIREKYLIN_PROJECT_PATH: root, DISALLOW_FILE_EDIT: '1'}
    });
    child.stdout.on('data', chunk => {startupLog = (startupLog + chunk).slice(-4000)});
    child.stderr.on('data', chunk => {startupLog = (startupLog + chunk).slice(-4000)});
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      try {
        const response = await fetch(origin + '/admin/api/options');
        if (response.status === 200 && (await response.json()).errmsg === 'USER_NOT_LOGIN') {
          ready = true;
          break;
        }
      } catch { /* Wait for the local server to become ready. */ }
      if (child.exitCode !== null) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, 'Application startup failed: ' + startupLog);

    async function request(url, role, {method = 'GET', body, csrf = true, referrer = origin + '/admin'} = {}) {
      const token = tokens[role];
      const headers = {'content-type': 'application/json'};
      if (token) headers.cookie = auth.COOKIE_NAME + '=' + token;
      if (referrer) headers.referer = referrer;
      if (token && csrf) headers['X-CSRF-Token'] = csrf === true
        ? auth.csrfToken({state: {jwtSecret: secret}, cookie: () => token}) : csrf;
      const response = await fetch(origin + url, {method, headers, body: body && JSON.stringify(body)});
      return {status: response.status, data: await response.json()};
    }
    async function denied(url, role, options) {
      const result = await request(url, role, options);
      assert.equal(result.data.errmsg, 'USER_NO_PERMISSION', url);
    }

    await t.test('APIs without dedicated logic still require authentication and the shared role policy', async() => {
      for (const url of ['/admin/api/post', '/admin/api/attachment', '/admin/api/file']) {
        assert.equal((await request(url)).data.errmsg, 'USER_NOT_LOGIN');
      }
      await denied('/admin/api/file?exporter=markdown', 'editor');
      await denied('/admin/api/attachment', 'commenter');
      const media = await request('/admin/api/attachment', 'editor');
      assert.equal(media.data.errno, 0);
    });

    await t.test('options and dashboard expose no private configuration', async() => {
      const options = (await request('/admin/api/options', 'editor')).data;
      assert.equal(options.errno, 0);
      assert.equal(options.data.two_factor_auth, true);
      assert.equal(options.data.upload, undefined);
      assert.equal(options.data.push_sites, undefined);
      assert.equal((await request('/admin/api/options?type=defaultCategory', 'editor')).data.data, '8');
      await denied('/admin/api/options?type=2fa', 'editor');
      await denied('/admin/api/options?type=push', 'editor');
      await denied('/admin/api/options?type=unknown', 'editor');
      const system = (await request('/admin/api/system', 'editor')).data;
      assert.equal(system.errno, 0);
      assert.deepEqual(system.data.config, {});
      const admin = (await request('/admin/api/options?type=2fa', 'admin')).data;
      assert.equal(admin.data.secret, 'A'.repeat(32));
    });

    await t.test('logic and REST use identical path/query resource IDs', async() => {
      for (const url of ['/admin/api/user/2', '/admin/api/user?id=2', '/admin/api/user/%32',
        '/admin/api/user/1?id=2', '/admin/api/user/2?id=1&id=3']) {
        const result = (await request(url, 'editor')).data;
        assert.equal(result.errno, 0, url);
        assert.equal(result.data.id, 2, url);
        assert.equal(result.data.app_key, undefined);
        assert.equal(result.data.app_secret, undefined);
      }
      for (const url of ['/admin/api/user/1', '/admin/api/user?id=1', '/admin/api/user/%31',
        '/admin/api/user/2?id=1', '/admin/api/user/1?id=2&id=3', '/admin/api/user/1,2']) {
        await denied(url, 'editor');
      }
      await denied('/admin/api/user', 'commenter');
      await denied('/admin/api/user/3/', 'commenter');
      const self = (await request('/admin/api/user/3', 'commenter')).data;
      assert.equal(self.errno, 0);
      assert.equal(self.data.id, 3);
      const directory = (await request('/admin/api/user', 'editor')).data.data;
      assert.ok(directory.every(user => !('email' in user) && !('app_secret' in user)));
    });

    await t.test('POST method overrides retain referrer, resource and existing CSRF checks', async() => {
      const url = '/admin/api/user/3?method=put';
      const options = {method: 'POST', csrf: false,
        body: {display_name: 'Changed', type: 1, app_secret: 'injected'}};
      for (const csrf of [false, 'wrong']) {
        assert.equal((await request('/admin/api/chat', 'editor', {...options, csrf})).status, 403);
        assert.equal((await request('/admin/api/system?method=update', 'admin', {...options, csrf})).status, 403);
      }
      const update = await request('/admin/api/system?method=update', 'admin', {method: 'POST', body: {}});
      assert.equal(update.data.errmsg, 'External fetch disabled in test');
      const read = await request('/admin/api/system/update', 'admin');
      assert.equal(read.data.errno, 0);
      assert.ok(read.data.data.versions);
      for (const referrer of ['', 'https://unrelated.invalid/admin']) {
        assert.equal((await request(url, 'commenter', {...options, referrer})).data.errmsg, 'REFERRER_ERROR');
      }
      await denied('/admin/api/user/2?method=put', 'commenter', options);
      await denied(url + '&type=contributor', 'commenter', options);
      assert.equal(db.prepare('SELECT display_name FROM fk_user WHERE id=3').get().display_name, 'Commenter');
      assert.equal((await request(url, 'commenter', options)).data.errno, 0);
      assert.deepEqual(db.prepare('SELECT display_name, type, app_secret FROM fk_user WHERE id=3').get(),
        {display_name: 'Changed', type: 4, app_secret: 'synthetic-user-secret'});
    });

    await t.test('existing category, tag and theme logic remains active', async() => {
      for (const name of ['cate', 'tag']) {
        const result = await request(`/admin/api/${name}`, 'admin', {method: 'POST', body: {}});
        assert.notEqual(result.data.errno, 0);
        assert.ok(result.data.errmsg.name);
      }
      const metadata = (await request('/admin/api/theme?type=themeFields&theme=missing', 'editor')).data;
      assert.equal(metadata.errno, 0);
      await denied('/admin/api/theme?type=file&filePath=firekylin/package.json', 'editor');
      const blocked = await request('/admin/api/theme?method=update', 'admin',
        {method: 'POST', body: {filePath: 'missing', content: 'test'}});
      assert.equal(blocked.data.errmsg, 'FILE_EDIT_DISALLOWED!');
    });
  } finally {
    await stop(child);
    if (db) db.close();
    fs.rmSync(root, {recursive: true, force: true});
  }
});
