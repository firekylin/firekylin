'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const JSZip = require('jszip');
const {ThemeInstaller} = require('../../src/service/theme-installer');
const {GitHubExtensionDispatch} = require('../../src/service/github-extension-dispatch');

function fixture(extra = []) {
  const calls = [];
  const tree = [{path: 'package.json', type: 'blob', mode: '100644', sha: 'package'}, ...extra];
  const client = new GitHubExtensionDispatch({connection: {repository: 'owner/site', token: 'secret'},
    fetcher: async(url, options) => {
      const endpoint = url.split('/repos/owner/site')[1];
      const body = options.body && JSON.parse(options.body);
      calls.push({endpoint, body, options});
      let result;
      if (endpoint === '') result = {default_branch: 'main'};
      else if (endpoint === '/git/ref/heads/main') result = {object: {sha: 'base'}};
      else if (endpoint === '/git/commits/base') result = {tree: {sha: 'base-tree'}};
      else if (endpoint === '/git/trees/base-tree?recursive=1') result = {tree};
      else if (endpoint === '/git/blobs/package') result = {encoding: 'base64',
        content: Buffer.from(JSON.stringify({dependencies: {firekylin: '2.16.0'}})).toString('base64')};
      else if (endpoint === '/git/blobs/plugin') result = {encoding: 'base64',
        content: Buffer.from(JSON.stringify({name: 'demo'})).toString('base64')};
      else if (endpoint === '/git/blobs') result = {sha: 'new-blob'};
      else if (endpoint === '/git/trees') result = {sha: 'new-tree'};
      else if (endpoint === '/git/commits') result = {sha: 'new-commit'};
      else if (endpoint === '/git/refs') result = {};
      else if (endpoint === '/pulls') result = {html_url: 'https://github.com/owner/site/pull/1'};
      else throw new Error(`Unexpected request ${endpoint}`);
      return {ok: true, json: async() => result};
    }});
  return {client, calls};
}

test('creates a branch and PR with an exact plugin dependency', async() => {
  const {client, calls} = fixture();
  const result = await client.dispatch({operation: 'plugin.install', name: 'firekylin-plugin-demo', version: '1.0.0'});
  assert.deepEqual(result, {status: 'created', url: 'https://github.com/owner/site/pull/1'});
  const tree = calls.find(call => call.endpoint === '/git/trees').body;
  assert.equal(tree.base_tree, 'base-tree');
  assert.equal(JSON.parse(tree.tree[0].content).dependencies['firekylin-plugin-demo'], '1.0.0');
  assert.equal(calls.find(call => call.endpoint === '/pulls').body.base, 'main');
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.ok(calls.every(call => call.options.redirect === 'error'));
});

test('rejects locked repositories and invalid plugin versions before writing', async() => {
  const {client, calls} = fixture([{path: 'pnpm-lock.yaml', type: 'blob'}]);
  await assert.rejects(client.dispatch({operation: 'plugin.install', name: 'firekylin-plugin-demo', version: '1.0.0'}), /GITHUB_LOCKFILE_NOT_SUPPORTED/);
  assert.equal(calls.some(call => call.options.method === 'POST'), false);
  await assert.rejects(client.dispatch({operation: 'plugin.install', name: 'firekylin-plugin-demo', version: '^1.0.0'}));
});

test('uploads verified theme files without changing local project files', async() => {
  const zip = new JSZip();
  zip.file('package.json', JSON.stringify({name: 'paper', version: '1.0.0', firekylin: {id: 'paper', type: 'theme'}}));
  zip.file('index.eta', 'hello');
  const archive = await zip.generateAsync({type: 'nodebuffer'});
  const inspected = await new ThemeInstaller({themesPath: '/tmp/themes', backupPath: '/tmp/backups', firekylinVersion: '2.16.0'}).inspect(archive);
  const {client, calls} = fixture();
  await client.dispatch({operation: 'theme.install', inspected});
  const entries = calls.find(call => call.endpoint === '/git/trees').body.tree;
  assert.deepEqual(entries.map(entry => entry.path).sort(), ['themes/paper/index.eta', 'themes/paper/package.json']);
  assert.equal(calls.filter(call => call.endpoint === '/git/blobs').length, 2);
});

test('deletes only the matching local plugin files', async() => {
  const {client, calls} = fixture([{path: 'plugins', type: 'tree'}, {path: 'plugins/demo', type: 'tree'},
    {path: 'plugins/demo/package.json', type: 'blob', mode: '100644', sha: 'plugin'},
    {path: 'plugins/demo/index.js', type: 'blob', mode: '100644', sha: 'source'}]);
  await client.dispatch({operation: 'plugin.delete-local', id: 'demo', directory: 'demo'});
  const entries = calls.find(call => call.endpoint === '/git/trees').body.tree;
  assert.equal(entries.length, 2);
  assert.ok(entries.every(entry => entry.path.startsWith('plugins/demo/') && entry.sha === null));
});

test('updates the existing dependency without moving its section', async() => {
  const {client, calls} = fixture();
  client.blob = async() => Buffer.from(JSON.stringify({devDependencies: {'firekylin-plugin-demo': '1.0.0'}}));
  await client.dispatch({operation: 'plugin.update', name: 'firekylin-plugin-demo', version: '2.0.0'});
  const manifest = JSON.parse(calls.find(call => call.endpoint === '/git/trees').body.tree[0].content);
  assert.equal(manifest.devDependencies['firekylin-plugin-demo'], '2.0.0');
  assert.equal(manifest.dependencies, undefined);
  await assert.rejects(client.dispatch({operation: 'plugin.update', name: 'firekylin-plugin-demo', version: '0.9.0'}),
    /PLUGIN_VERSION_NOT_NEWER/);
});

test('theme update replaces changed files and removes obsolete files', async() => {
  const zip = new JSZip();
  zip.file('package.json', JSON.stringify({name: 'paper', version: '2.0.0', firekylin: {id: 'paper', type: 'theme'}}));
  zip.file('index.eta', 'new');
  const inspected = await new ThemeInstaller({themesPath: '/tmp/themes', backupPath: '/tmp/backups',
    firekylinVersion: '2.16.0'}).inspect(await zip.generateAsync({type: 'nodebuffer'}));
  const {client, calls} = fixture([{path: 'themes', type: 'tree'}, {path: 'themes/paper', type: 'tree'},
    {path: 'themes/paper/package.json', type: 'blob', mode: '100644', sha: 'old-manifest'},
    {path: 'themes/paper/index.eta', type: 'blob', mode: '100644', sha: 'old-index'},
    {path: 'themes/paper/obsolete.css', type: 'blob', mode: '100644', sha: 'old-css'}]);
  client.blob = async() => Buffer.from(JSON.stringify({name: 'paper', version: '1.0.0'}));
  await client.dispatch({operation: 'theme.update', inspected});
  const entries = calls.find(call => call.endpoint === '/git/trees').body.tree;
  assert.equal(entries.find(entry => entry.path.endsWith('/obsolete.css')).sha, null);
  assert.equal(entries.filter(entry => entry.path.endsWith('/index.eta')).length, 1);
  assert.equal(entries.find(entry => entry.path.endsWith('/index.eta')).sha, 'new-blob');
});
