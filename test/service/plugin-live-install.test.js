'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {PluginManager} = require('../../src/plugin/manager');
const {installPlugin} = require('../../src/service/plugin-live-install');

async function fixture(t, {enabled = true, broken = false} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'live-plugin-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const manager = new PluginManager({projectPath: root, version: '2.19.0',
    stateStore: {enabled: async() => enabled}, logger: {error() {}}});
  await manager.load();
  const installer = {install: async() => {
    const dir = path.join(root, 'node_modules/live-demo');
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({dependencies: {'live-demo': '1.0.0'}}));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      name: 'live-demo', version: '1.0.0', main: 'index.js', firekylin: {type: 'plugin'}
    }));
    fs.writeFileSync(path.join(dir, 'index.js'), broken ? 'throw new Error("broken");' : `
      module.exports = {
        register(ctx) {
          ctx.routes.register({path: '/hello', handler: () => 'hello'});
        }
      };
    `);
    return {restartRequired: true};
  }};
  const options = {runtime: {env: {FIREKYLIN_PLUGIN_LIVE_INSTALL: '1'}}, worker: false};
  return {manager, installer, options};
}

test('new npm plugin activates without restart and upgrade preserves the running module', async t => {
  const {manager, installer, options} = await fixture(t);
  const result = await installPlugin(installer, manager, 'live-demo', '1.0.0', options);
  assert.equal(result.restartRequired, false);
  const route = manager.routes.match('GET', '/api/plugins/live-demo/hello');
  assert.equal(route.handler(), 'hello');
  assert.equal((await installPlugin(installer, manager, 'live-demo', '1.0.0', options)).restartRequired, true);
  assert.equal(manager.routes.match('GET', '/api/plugins/live-demo/hello'), route);
});

test('disabled plugins stay disabled without requiring restart', async t => {
  const {manager, installer, options} = await fixture(t, {enabled: false});
  assert.equal((await installPlugin(installer, manager, 'live-demo', '1.0.0', options)).restartRequired, false);
  assert.equal(manager.plugins.size, 0);
  assert.equal(manager.states.get('live-demo').enabled, false);
});

test('broken plugin retains restart guidance after successful installation', async t => {
  const {manager, installer, options} = await fixture(t, {broken: true});
  assert.equal((await installPlugin(installer, manager, 'live-demo', '1.0.0', options)).restartRequired, true);
});

for (const mode of ['default', 'worker', 'ipc', 'vercel', 'workers']) {
  test(`${mode} runtime retains existing restart behavior`, async t => {
    const {manager, installer, options} = await fixture(t);
    if (mode === 'default') options.runtime.env = {};
    if (mode === 'worker') options.worker = true;
    if (mode === 'ipc') options.runtime.send = () => {};
    if (mode === 'vercel') options.runtime.env.VERCEL = '1';
    if (mode === 'workers') options.runtime.env.THINK_WORKERS = '2';
    assert.equal((await installPlugin(installer, manager, 'live-demo', '1.0.0', options)).restartRequired, true);
    assert.equal(manager.plugins.size, 0);
  });
}
