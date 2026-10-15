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
});
