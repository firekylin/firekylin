'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {PluginStateStore, stateKey} = require('../../src/plugin/state-store');
const {PluginManager} = require('../../src/plugin/manager');

function model(rows = new Map()) {
  return {
    async ensureOption() { assert.fail('plugin startup must not write migration snapshots') },
    async getCredentialValue(key) {
      assert.notEqual(key, 'plugin_state_migration_v1');
      return rows.get(key);
    },
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

for (const snapshot of [undefined, '["existing"]', 'invalid JSON']) {
  test(`missing state stays disabled regardless of legacy snapshot: ${snapshot}`, async t => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-state-'));
    t.after(() => { fs.rmSync(project, {recursive: true, force: true}); delete global.__pluginStateTest });
    global.__pluginStateTest = [];
    const rows = new Map(snapshot === undefined ? [] : [['plugin_state_migration_v1', snapshot]]);
    const db = model(rows);
    addPlugin(project, 'existing');
    const makeManager = () => new PluginManager({projectPath: project, version: '2.17.0', stateStore: new PluginStateStore(db)});
    let manager = makeManager();
    await manager.load();
    assert.deepEqual(global.__pluginStateTest, []);
    assert.equal(manager.states.get('existing').enabled, false);
    addPlugin(project, 'new-plugin');
    await manager.stateStore.set('existing', true);
    await manager.stateStore.set('new-plugin', false);
    manager = makeManager();
    await manager.load();
    assert.deepEqual(global.__pluginStateTest, ['existing']);
    assert.equal(manager.states.get('existing').enabled, true);
    assert.equal(manager.states.get('new-plugin').enabled, false);
    await manager.stateStore.set('existing', false);
    global.__pluginStateTest = [];
    await makeManager().load();
    assert.deepEqual(global.__pluginStateTest, []);
    assert.equal(rows.get('plugin_state_migration_v1'), snapshot);
  });
}

test('invalid explicit state is still rejected', async() => {
  const store = new PluginStateStore(model(new Map([[stateKey('example'), 'invalid']])));
  await assert.rejects(store.enabled('example'), /INVALID_PLUGIN_STATE/);
});
