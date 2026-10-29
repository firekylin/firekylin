'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const auth = require('../../src/service/admin-auth');
const load = Module._load;
let Controller;
try {
  Module._load = function(name, parent, isMain) {
    if (name === './base' && parent.filename.endsWith('/admin/api/marketplace.js')) return class {};
    return load.call(this, name, parent, isMain);
  };
  Controller = require('../../src/controller/admin/api/marketplace');
} finally { Module._load = load }

test('plugin state mutations require an administrator and CSRF, then persist the selected state', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-api-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name: 'demo', version: '1.0.0',
    firekylin: {id: 'demo', entry: 'plugin.js', type: 'plugin'}}));
  fs.writeFileSync(path.join(root, 'plugin.js'), 'module.exports = {}');
  const old = global.firekylin;
  t.after(() => { global.firekylin = old });
  const values = [];
  global.firekylin = {plugins: {discover: () => [root], stateStore: {set: async(...args) => values.push(args)}}};
  const controller = new Controller();
  controller.githubConnection = async() => null;
  const secret = 'marketplace-controller-test-secret-32-bytes';
  const cookie = auth.sign({id: 1, type: 1, name: 'admin'}, secret);
  controller.ctx = {state: {jwtSecret: secret}, cookie: () => cookie, headers: {},
    get(name) { return this.headers[name] || '' },
    throw(status) { throw Object.assign(new Error('denied'), {status}) }};
  controller.userInfo = {type: 2};
  controller.post = key => ({operation: 'plugin.enable', id: 'demo'})[key];
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  controller.catalog = () => ({check: () => ({compatible: true})});
  assert.throws(() => controller.postAction(), {status: 403});
  controller.userInfo.type = 1;
  assert.throws(() => controller.postAction(), {status: 403});
  controller.ctx.headers['X-CSRF-Token'] = auth.csrfToken(controller.ctx);
  const result = await controller.postAction();
  assert.equal(result.errno, 0);
  assert.deepEqual(values, [['demo', true]]);
});

test('local deletion rejects active plugins and paths outside the plugin directory', async t => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-delete-'));
  t.after(() => fs.rmSync(project, {recursive: true, force: true}));
  const base = path.join(project, 'plugins');
  const root = path.join(base, 'demo');
  fs.mkdirSync(root, {recursive: true});
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name: 'demo', version: '1.0.0',
    firekylin: {id: 'demo', entry: 'plugin.js', type: 'plugin'}}));
  const previous = global.firekylin;
  t.after(() => { global.firekylin = previous });
  const states = [];
  const manager = {discover: () => [fs.realpathSync(root)], pluginRoot: () => base,
    plugins: new Map([['demo', {status: 'active'}]]), stateStore: {set: async(...args) => states.push(args)}};
  global.firekylin = {plugins: manager};
  const controller = new Controller();
  controller.githubConnection = async() => null;
  controller.post = key => key === 'id' ? 'demo' : undefined;
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  assert.equal((await controller.mutate('plugin.delete-local')).message, 'PLUGIN_MUST_BE_DISABLED');
  assert.equal(fs.existsSync(root), true);
  manager.plugins.clear();
  manager.pluginRoot = () => project;
  assert.equal((await controller.mutate('plugin.delete-local')).message, 'INVALID_LOCAL_PLUGIN_PATH');
  assert.equal(fs.existsSync(root), true);
  manager.pluginRoot = () => base;
  assert.equal((await controller.mutate('plugin.delete-local')).errno, 0);
  assert.equal(fs.existsSync(root), false);
  assert.deepEqual(states, [['demo', false]]);
});

test('preserves ThinkJS response control flow after successful state changes', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-response-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name: 'demo', version: '1.0.0',
    firekylin: {id: 'demo', entry: 'plugin.js', type: 'plugin'}}));
  const previous = global.firekylin;
  t.after(() => { global.firekylin = previous });
  const states = [];
  global.firekylin = {plugins: {discover: () => [root], stateStore: {set: async(...args) => states.push(args)}}};
  const controller = new Controller();
  controller.githubConnection = async() => null;
  controller.post = key => key === 'id' ? 'demo' : undefined;
  controller.success = () => { throw new Error('PREVENT_NEXT_PROCESS') };
  controller.fail = () => { throw new Error('unexpected failure response') };
  await assert.rejects(controller.mutate('plugin.disable'), {message: 'PREVENT_NEXT_PROCESS'});
  assert.deepEqual(states, [['demo', false]]);
});

test('deletes a malformed local plugin and clears its cached record', async t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-invalid-'));
  t.after(() => fs.rmSync(base, {recursive: true, force: true}));
  const root = path.join(fs.realpathSync(base), 'broken');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name: 'broken', version: 'invalid'}));
  const previous = global.firekylin;
  t.after(() => { global.firekylin = previous });
  const manager = {discover: () => fs.existsSync(root) ? [root] : [], pluginRoot: () => base,
    plugins: new Map([['broken', {root, status: 'error'}]]), states: new Map([['broken', {}]]),
    stateStore: {set: async() => {}}};
  global.firekylin = {plugins: manager};
  const controller = new Controller();
  controller.githubConnection = async() => null;
  controller.post = key => key === 'id' ? 'broken' : undefined;
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  assert.equal((await controller.mutate('plugin.delete-local')).errno, 0);
  assert.equal(fs.existsSync(root), false);
  assert.equal(manager.plugins.has('broken'), false);
  assert.equal(manager.states.has('broken'), false);
});

test('marketplace installation rechecks registry, compatibility and installed packages', async t => {
  const previous = global.fetch;
  t.after(() => { global.fetch = previous });
  const controller = new Controller();
  controller.githubConnection = async() => null;
  const item = {type: 'plugin', name: 'firekylin-plugin-demo', version: '1.0.0', engines: {firekylin: '>=2'}};
  const registry = entries => { global.fetch = async() => new Response(JSON.stringify({schemaVersion: 1, packages: entries})) };
  registry([item]);
  controller.post = key => ({name: item.name, version: item.version})[key];
  controller.model = () => ({getOptions: async() => ({})});
  controller.catalog = () => ({check: () => ({compatible: true}), plugins: () => []});
  const calls = [];
  controller.pluginInstaller = () => ({install: async(...args) => { calls.push(args); return {restartRequired: true} }});
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  assert.equal((await controller.mutate('plugin.install-registry')).errno, 0);
  assert.deepEqual(calls, [[item.name, item.version]]);
  registry([]);
  assert.equal((await controller.mutate('plugin.install-registry')).message, 'PLUGIN_NOT_IN_REGISTRY');
  registry([item, item]);
  assert.equal((await controller.mutate('plugin.install-registry')).message, 'PLUGIN_NOT_IN_REGISTRY');
  registry([item]);
  controller.catalog = () => ({check: () => ({compatible: false, reasons: ['NODE_VERSION']})});
  assert.equal((await controller.mutate('plugin.install-registry')).message, 'NODE_VERSION');
  controller.catalog = () => ({check: () => ({compatible: true}), plugins: () => [{name: item.name}]});
  assert.equal((await controller.mutate('plugin.install-registry')).message, 'PLUGIN_ALREADY_INSTALLED');
  assert.equal(calls.length, 1);
});

test('registry installation preserves firekylin.engine compatibility requirements', async t => {
  const previous = global.fetch;
  t.after(() => { global.fetch = previous });
  const {compatibility} = require('../../src/service/package-catalog');
  global.fetch = async() => new Response(JSON.stringify({schemaVersion: 1, packages: [{
    type: 'plugin', name: 'firekylin-plugin-demo', version: '1.0.0',
    firekylin: {engine: '>=99.0.0'}, engines: {firekylin: '>=1.0.0'}
  }]}));
  const controller = new Controller();
  controller.githubConnection = async() => null;
  controller.post = key => ({name: 'firekylin-plugin-demo', version: '1.0.0'})[key];
  controller.model = () => ({getOptions: async() => ({})});
  controller.catalog = () => ({check: manifest => compatibility(manifest, {firekylin: '2.16.0', node: '22.0.0'}),
    plugins: () => []});
  let installed = false;
  controller.pluginInstaller = () => ({install: async() => { installed = true }});
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  assert.equal((await controller.mutate('plugin.install-registry')).message, 'FIREKYLIN_VERSION');
  assert.equal(installed, false);
});

test('theme registry installation validates integrity and archive identity before writing', async t => {
  const JSZip = require('jszip');
  const crypto = require('crypto');
  const {ThemeInstaller} = require('../../src/service/theme-installer');
  const {compatibility} = require('../../src/service/package-catalog');
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-theme-'));
  t.after(() => fs.rmSync(base, {recursive: true, force: true}));
  const previous = global.fetch;
  t.after(() => { global.fetch = previous });
  const zip = new JSZip();
  zip.file('package.json', JSON.stringify({name: 'paper', version: '1.0.0', firekylin: {id: 'paper', type: 'theme'}}));
  zip.file('index.eta', '<h1>Paper</h1>');
  const archive = await zip.generateAsync({type: 'nodebuffer'});
  const item = {type: 'theme', name: 'paper', id: 'paper', version: '1.0.0',
    download: 'https://raw.githubusercontent.com/firekylin/themes/main/paper.zip',
    integrity: `sha512-${crypto.createHash('sha512').update(archive).digest('base64')}`};
  const entries = [item];
  global.fetch = async url => url.pathname.endsWith('paper.zip') ? new Response(archive)
    : new Response(JSON.stringify({schemaVersion: 1, packages: entries}));
  const controller = new Controller();
  controller.githubConnection = async() => null;
  controller.post = key => ({name: 'paper', version: '1.0.0'})[key];
  controller.model = () => ({getOptions: async() => ({})});
  controller.catalog = () => ({check: manifest => compatibility(manifest, {firekylin: '2.16.0', node: '22.0.0'})});
  controller.installer = () => new ThemeInstaller({themesPath: path.join(base, 'themes'),
    backupPath: path.join(base, 'backups'), firekylinVersion: '2.16.0'});
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  item.integrity = `sha512-${Buffer.alloc(64).toString('base64')}`;
  assert.equal((await controller.mutate('theme.install-registry')).message, 'THEME_INTEGRITY_MISMATCH');
  item.integrity = `sha512-${crypto.createHash('sha512').update(archive).digest('base64')}`;
  item.id = 'different';
  assert.equal((await controller.mutate('theme.install-registry')).message, 'THEME_ARCHIVE_METADATA_MISMATCH');
  item.id = 'paper';
  assert.equal((await controller.mutate('theme.install-registry')).errno, 0);
  assert.equal(fs.readFileSync(path.join(base, 'themes/paper/index.eta'), 'utf8'), '<h1>Paper</h1>');
  assert.equal((await controller.mutate('theme.install-registry')).message, 'THEME_ALREADY_INSTALLED');
});

test('GitHub mode creates a PR without running local installer', async t => {
  const previous = global.fetch;
  t.after(() => { global.fetch = previous });
  const requests = [];
  global.fetch = async(url, options = {}) => {
    const address = String(url);
    requests.push(address);
    let data;
    if (address.endsWith('/repos/owner/site')) data = {default_branch: 'main'};
    else if (address.endsWith('/git/ref/heads/main')) data = {object: {sha: 'base'}};
    else if (address.endsWith('/git/commits/base')) data = {tree: {sha: 'tree'}};
    else if (address.endsWith('/git/trees/tree?recursive=1')) data = {tree: [
      {path: 'package.json', type: 'blob', mode: '100644', sha: 'package'},
      {path: 'firekylin.config.js', type: 'blob', mode: '100644', sha: 'config'}]};
    else if (address.endsWith('/git/blobs/package')) data = {encoding: 'base64', content: Buffer.from('{}').toString('base64')};
    else if (address.endsWith('/git/blobs/config')) data = {encoding: 'base64',
      content: Buffer.from('module.exports = {};\n').toString('base64')};
    else if (address.endsWith('/git/trees')) data = {sha: 'updated'};
    else if (address.endsWith('/git/commits')) data = {sha: 'newcommit'};
    else if (address.endsWith('/git/refs')) data = {};
    else if (address.endsWith('/pulls')) data = {html_url: 'https://github.com/owner/site/pull/1'};
    else data = {schemaVersion: 1, packages: [{type: 'plugin', name: 'firekylin-plugin-demo', version: '1.0.0'}]};
    return new Response(JSON.stringify(data));
  };
  const controller = new Controller();
  controller.githubConnection = async() => ({repository: 'owner/site', token: 'secret'});
  controller.post = key => ({name: 'firekylin-plugin-demo', version: '1.0.0'})[key];
  controller.model = () => ({getOptions: async() => ({})});
  controller.catalog = () => ({check: () => ({compatible: true}), plugins: () => []});
  controller.pluginInstaller = () => { throw new Error('LOCAL_INSTALLER_CALLED') };
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  const result = await controller.mutate('plugin.install-registry');
  assert.equal(result.data.status, 'created');
  assert.equal(requests.filter(url => url.endsWith('/pulls')).length, 1);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('plugin updates require a newer installed npm version and use the installer', async t => {
  const previous = global.fetch;
  t.after(() => { global.fetch = previous });
  global.fetch = async() => new Response(JSON.stringify({schemaVersion: 1, packages: [
    {type: 'plugin', name: 'firekylin-plugin-demo', version: '2.0.0'}]}));
  const controller = new Controller();
  controller.githubConnection = async() => null;
  controller.post = key => ({name: 'firekylin-plugin-demo', version: '2.0.0'})[key];
  controller.model = () => ({getOptions: async() => ({})});
  const installed = {name: 'firekylin-plugin-demo', version: '1.0.0', source: 'npm', status: 'active'};
  controller.catalog = () => ({check: () => ({compatible: true}), plugins: () => [installed]});
  let calls = 0;
  controller.pluginInstaller = () => ({install: async() => { calls++; return {restartRequired: true} }});
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  assert.equal((await controller.mutate('plugin.update-registry')).errno, 0);
  assert.equal(calls, 1);
  installed.version = '2.0.0';
  assert.equal((await controller.mutate('plugin.update-registry')).message, 'PLUGIN_VERSION_NOT_NEWER');
  installed.version = '1.0.0'; installed.source = 'local';
  assert.equal((await controller.mutate('plugin.update-registry')).message, 'PLUGIN_NOT_FOUND');
  assert.equal(calls, 1);
});

test('theme update checks versions and retains a backup before replacement', async t => {
  const JSZip = require('jszip');
  const crypto = require('crypto');
  const {ThemeInstaller} = require('../../src/service/theme-installer');
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-update-'));
  t.after(() => fs.rmSync(base, {recursive: true, force: true}));
  const previous = global.fetch;
  t.after(() => { global.fetch = previous });
  const archive = async(version, contents) => {
    const zip = new JSZip();
    zip.file('package.json', JSON.stringify({name: 'paper', version, firekylin: {id: 'paper', type: 'theme'}}));
    zip.file('index.eta', contents);
    return zip.generateAsync({type: 'nodebuffer'});
  };
  const installer = new ThemeInstaller({themesPath: path.join(base, 'themes'), backupPath: path.join(base, 'backups'),
    firekylinVersion: '2.16.0'});
  await installer.install(await archive('1.0.0', 'old'));
  const latest = await archive('2.0.0', 'new');
  const item = {type: 'theme', name: 'paper', id: 'paper', version: '2.0.0',
    download: 'https://raw.githubusercontent.com/firekylin/themes/main/paper.zip',
    integrity: 'sha512-' + crypto.createHash('sha512').update(latest).digest('base64')};
  global.fetch = async url => url.pathname.endsWith('.zip') ? new Response(latest)
    : new Response(JSON.stringify({schemaVersion: 1, packages: [item]}));
  const controller = new Controller();
  controller.githubConnection = async() => null;
  controller.post = key => ({name: item.name, version: item.version})[key];
  controller.model = () => ({getOptions: async() => ({})});
  const installed = {id: 'paper', name: 'paper', version: '1.0.0'};
  controller.catalog = () => ({check: () => ({compatible: true}), themes: () => [installed]});
  controller.installer = () => installer;
  controller.authOptions = {theme: 'paper'};
  let reloaded = false;
  controller.reloadActiveTheme = () => { reloaded = true };
  controller.success = data => ({errno: 0, data});
  controller.fail = message => ({errno: 1, message});
  const result = await controller.mutate('theme.update-registry');
  assert.equal(result.errno, 0);
  assert.equal(fs.readFileSync(path.join(base, 'themes/paper/index.eta'), 'utf8'), 'new');
  assert.equal(fs.readFileSync(path.join(base, 'backups', result.data.backup, 'index.eta'), 'utf8'), 'old');
  assert.equal(reloaded, true);
  installed.version = '2.0.0';
  assert.equal((await controller.mutate('theme.update-registry')).message, 'THEME_VERSION_NOT_NEWER');
});
