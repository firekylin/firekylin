'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {PackageCatalog, compatibility} = require('../../src/service/package-catalog');

test('lists safe installed plugin and theme metadata', t => {
  const themesPath = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-catalog-'));
  t.after(() => fs.rmSync(themesPath, {recursive: true, force: true}));
  fs.mkdirSync(path.join(themesPath, 'paper'));
  fs.writeFileSync(path.join(themesPath, 'paper/package.json'), JSON.stringify({
    name: 'Paper', version: '1.2.0', description: 'A theme', secret: 'hidden'
  }));
  const pluginManager = {plugins: new Map([['demo', {
    root: '/app/node_modules/@firekylin/plugin-demo', status: 'active',
    manifest: {id: 'demo', name: '@firekylin/plugin-demo', version: '2.0.0', permissions: ['content:read']}
  }]])};
  const catalog = new PackageCatalog({pluginManager, themesPath, firekylinVersion: '2.10.6', nodeVersion: '22.14.0'});
  const installed = catalog.installed('paper');
  assert.deepEqual(installed.runtime, {firekylin: '2.10.6', node: '22.14.0'});
  assert.equal(installed.plugins[0].source, 'npm');
  assert.deepEqual(installed.plugins[0].permissions, ['content:read']);
  assert.equal(installed.themes[0].active, true);
  assert.equal('secret' in installed.themes[0], false);
});

test('checks Firekylin, Node.js and package type compatibility', () => {
  const runtime = {firekylin: '2.10.6', node: '22.14.0'};
  assert.deepEqual(compatibility({firekylin: {type: 'plugin'}, engines: {
    firekylin: '>=2.10.0', node: '>=22'
  }}, runtime), {compatible: true, reasons: []});
  assert.deepEqual(compatibility({firekylin: {type: 'plugin'}, engines: {
    firekylin: '>=3', node: '>=24'
  }}, runtime), {compatible: false, reasons: ['FIREKYLIN_VERSION', 'NODE_VERSION']});
  assert.deepEqual(compatibility({type: 'library'}, runtime), {
    compatible: false, reasons: ['UNSUPPORTED_PACKAGE_TYPE']
  });
  assert.deepEqual(compatibility({firekylin: {type: 'plugin', engine: '>=2'}, engines: {
    firekylin: '>=3'
  }}, runtime), {compatible: true, reasons: []});
});

test('lists discovered plugins that failed to load', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-plugin-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    name: '@firekylin/broken', version: '1.0.0', description: 'Needs a newer Firekylin',
    firekylin: {type: 'plugin', id: 'broken', permissions: ['content:read']}
  }));
  const pluginManager = {plugins: new Map(), discover: () => [root]};
  const catalog = new PackageCatalog({pluginManager, firekylinVersion: '2.10.6'});
  assert.deepEqual(catalog.plugins(), [{
    id: 'broken', name: '@firekylin/broken', version: '1.0.0',
    description: 'Needs a newer Firekylin', author: '', authorUrl: '', permissions: ['content:read'],
    source: 'local', status: 'error', reasons: ['INVALID_PLUGIN_MANIFEST']
  }]);
});

test('lists symlinked themes only when their target stays inside the themes root', t => {
  const themesPath = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-themes-'));
  const externalPath = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-external-theme-'));
  t.after(() => {
    fs.rmSync(themesPath, {recursive: true, force: true});
    fs.rmSync(externalPath, {recursive: true, force: true});
  });
  fs.mkdirSync(path.join(themesPath, 'targets'));
  fs.writeFileSync(path.join(themesPath, 'targets/package.json'), JSON.stringify({name: 'Linked', version: '1.0.0'}));
  fs.writeFileSync(path.join(externalPath, 'package.json'), JSON.stringify({name: 'External', version: '1.0.0'}));
  fs.symlinkSync(path.join(themesPath, 'targets'), path.join(themesPath, 'linked'));
  fs.symlinkSync(externalPath, path.join(themesPath, 'external'));
  const catalog = new PackageCatalog({themesPath, firekylinVersion: '2.10.6'});
  assert.deepEqual(catalog.themes('linked').map(theme => theme.id), ['linked', 'targets']);
  assert.equal(catalog.themes('linked')[0].active, true);
});

test('reads author names and URLs from npm person strings and objects', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-authors-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const roots = ['first', 'second'].map((id, index) => {
    const directory = path.join(root, id);
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({name: id, version: '1.0.0',
      author: index ? {name: 'Bob', url: 'https://example.org/bob'} : 'Alice <a@example.org> (https://example.org/alice)',
      firekylin: {id, type: 'plugin', entry: 'plugin.js'}}));
    return directory;
  });
  const catalog = new PackageCatalog({pluginManager: {plugins: new Map(), discover: () => roots},
    firekylinVersion: '2.16.0'});
  assert.deepEqual(catalog.plugins().map(({author, authorUrl}) => ({author, authorUrl})), [
    {author: 'Alice', authorUrl: 'https://example.org/alice'}, {author: 'Bob', authorUrl: 'https://example.org/bob'}
  ]);
});
