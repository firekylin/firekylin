'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {PluginStateStore} = require('../../src/plugin/state-store');
const {PluginManager} = require('../../src/plugin/manager');

function model() {
  const rows = new Map();
  return {
    async ensureOption(key, value) { if (!rows.has(key)) rows.set(key, value); return rows.get(key) },
    async getCredentialValue(key) { return rows.get(key) },
    async setCredentialValue(key, value) { rows.set(key, value) }
  };
}

function addPlugin(project, id) {
  const root = path.join(project, 'plugins', id);
  fs.mkdirSync(root, {recursive: true});
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name: id, version: '1.0.0',
    firekylin: {id, type: 'plugin', entry: 'plugin.js'}}));
  fs.writeFileSync(path.join(root, 'plugin.js'), "global.__pluginStateTest.push('" + id + "'); module.exports = {register() {}};");
}

test('preserves existing plugins on migration, keeps new plugins inactive and persists changes', async t => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-state-'));
  t.after(() => { fs.rmSync(project, {recursive: true, force: true}); delete global.__pluginStateTest });
  global.__pluginStateTest = [];
  const db = model();
  addPlugin(project, 'existing');
  const makeManager = () => new PluginManager({projectPath: project, version: '2.16.0', stateStore: new PluginStateStore(db)});
  let manager = makeManager();
  await manager.load();
  assert.deepEqual(global.__pluginStateTest, ['existing']);
  addPlugin(project, 'new-plugin');
  manager = makeManager();
  await manager.load();
  assert.equal(manager.states.get('new-plugin').enabled, false);
  assert.equal(global.__pluginStateTest.includes('new-plugin'), false);
  await manager.stateStore.set('existing', false);
  await manager.stateStore.set('new-plugin', true);
  global.__pluginStateTest = [];
  manager = makeManager();
  await manager.load();
  assert.deepEqual(global.__pluginStateTest, ['new-plugin']);
  assert.equal(manager.states.get('existing').enabled, false);
});
