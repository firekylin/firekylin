'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

if (!process.env.FIREKYLIN_CORE) throw new Error('Set FIREKYLIN_CORE to the matching trusted host directory');
const core = path.resolve(process.env.FIREKYLIN_CORE);
const {PluginManager} = require(path.join(core, 'src/plugin/manager'));
const {PluginStateStore} = require(path.join(core, 'src/plugin/state-store'));
const version = require(path.join(core, 'package.json')).version;
const id = '__PLUGIN_ID__';

function fixture(t, config = {}, hostVersion = version) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-generated-'));
  const pluginRoot = path.join(root, 'plugins', id);
  fs.mkdirSync(pluginRoot, {recursive: true});
  for (const file of ['package.json', 'plugin.js']) {
    fs.copyFileSync(path.join(__dirname, '..', file), path.join(pluginRoot, file));
  }
  const values = new Map();
  const stateStore = new PluginStateStore({
    getCredentialValue: async key => values.get(key),
    setCredentialValue: async (key, value) => { values.set(key, value) }
  });
  const errors = [];
  const manager = new PluginManager({projectPath: root, version: hostVersion,
    config: {pluginConfig: {[id]: config}}, stateStore,
    logger: {error: message => errors.push(message), info() {}}
  });
  t.after(async () => {
    await manager.deactivate(id);
    fs.rmSync(root, {recursive: true, force: true});
  });
  return {manager, stateStore, errors};
}

test('discover disabled, enable, invoke, deactivate and reactivate', async t => {
  const {manager, stateStore, errors} = fixture(t, {message: '<script>untrusted</script>'});
  assert.equal(manager.discover().length, 1);
  await manager.load();
  assert.equal(manager.states.get(id).enabled, false);
  assert.equal(manager.plugins.size, 0);
  await stateStore.set(id, true);
  await manager.load();
  assert.deepEqual(errors, []);
  assert.equal(manager.plugins.get(id).status, 'active');
  const url = `/api/plugins/${id}/message`;
  assert.deepEqual(await manager.routes.match('GET', url).handler(), {message: '<script>untrusted</script>'});
  assert.equal(manager.routes.match('POST', url), undefined);
  assert.equal(await manager.templateContext({}).plugin[id].message(), '<script>untrusted</script>');
  await manager.deactivate(id);
  assert.equal(manager.routes.match('GET', url), undefined);
  assert.equal(manager.templateContext({}).plugin[id], undefined);
  await manager.activate(manager.plugins.get(id));
  assert.equal(manager.plugins.get(id).status, 'active');
  assert.equal(manager.routes.routes.length, 1);
  assert.deepEqual(errors, []);
});

test('default message', async t => {
  const {manager, stateStore, errors} = fixture(t);
  await stateStore.set(id, true);
  await manager.load();
  assert.deepEqual(errors, []);
  assert.equal(await manager.templateContext({}).plugin[id].message(), 'Welcome to this site');
});

for (const message of ['', '   ', 'x'.repeat(201), 42, null]) {
  test(`reject invalid message ${JSON.stringify(message).slice(0, 40)}`, async t => {
    const {manager, stateStore, errors} = fixture(t, {message});
    await stateStore.set(id, true);
    await manager.load();
    assert.equal(manager.plugins.get(id).status, 'error');
    assert.match(errors.join('\n'), /message must/);
    assert.equal(manager.routes.routes.length, 0);
    assert.equal(manager.templates.functions.size, 0);
  });
}

test('reject incompatible host', async t => {
  const {manager, stateStore, errors} = fixture(t, {}, '0.0.0');
  await stateStore.set(id, true);
  await manager.load();
  assert.equal(manager.plugins.size, 0);
  assert.match(errors.join('\n'), /requires Firekylin/);
});
