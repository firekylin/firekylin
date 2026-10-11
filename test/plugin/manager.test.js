'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {PluginManager} = require('../../src/plugin/manager');

function project() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-plugin-'));
}

function writePlugin(root, id, source, manifest = {}) {
  const dir = path.join(root, 'plugins', id);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name: `firekylin-plugin-${id}`,
    version: '1.0.0',
    main: 'plugin.js',
    firekylin: {id, ...manifest}
  }));
  fs.writeFileSync(path.join(dir, 'plugin.js'), source);
}

test('manager discovers and activates a plugin with an isolated context', async() => {
  const root = project();
  writePlugin(root, 'example', `module.exports = {
    register(ctx) { ctx.events.on('content.created', () => { global.__firekylinPluginCalled = ctx.id; }); },
    activate(ctx) { ctx.logger.info(ctx.manifest.name); }
  };`);
  const manager = new PluginManager({projectPath: root, version: '2.5.5', logger: {error() {}, info() {}}});
  await manager.load();
  await manager.events.emit('content.created', {});
  assert.equal(global.__firekylinPluginCalled, 'example');
  assert.equal(manager.plugins.get('example').status, 'active');
  await manager.deactivate('example');
  delete global.__firekylinPluginCalled;
});

test('manager isolates invalid plugins and continues loading', async() => {
  const root = project();
  writePlugin(root, 'invalid', 'module.exports = {};');
  writePlugin(root, 'valid', 'module.exports = {register() {}};');
  const errors = [];
  const manager = new PluginManager({projectPath: root, logger: {error(message) { errors.push(message) }}});
  await manager.load();
  assert.equal(manager.plugins.has('invalid'), false);
  assert.equal(manager.plugins.get('valid').status, 'active');
  assert.equal(errors.length, 1);
});

test('manager rejects incompatible engine versions', async() => {
  const root = project();
  writePlugin(root, 'future', 'module.exports = {register() {}}', {engine: '>=9.0.0'});
  const errors = [];
  const manager = new PluginManager({projectPath: root,
    version: '2.5.5',
    logger: {
      error(message) { errors.push(message) }
    }});
  await manager.load();
  assert.equal(manager.plugins.size, 0);
  assert.match(errors[0], /requires Firekylin/);
});

test('plugin context registers widgets and Eta-facing extensions', async() => {
  const root = project();
  writePlugin(root, 'template', `module.exports = {
    register(ctx) {
      ctx.templates.registerFunction('template.badge', ({text}) => '<b>' + text + '</b>');
      ctx.templates.registerFilter('template.upper', value => String(value).toUpperCase());
      ctx.templates.registerSlot('post.after', () => '<aside>after</aside>');
      class Example extends ctx.widgets.Widget {}
      ctx.widgets.register('Widget_Plugin_Template', Example);
    }
  };`);
  const manager = new PluginManager({projectPath: root, logger: {error() {}, info() {}}});
  await manager.load();
  const view = manager.templateContext({});
  assert.equal(await view.plugin.template.badge({text: 'ok'}), '<b>ok</b>');
  assert.equal(await view.filters['template.upper']('ok'), 'OK');
  assert.equal(await view.slots.render('post.after'), '<aside>after</aside>');
  assert.equal(manager.plugins.get('template').status, 'active');
  await manager.deactivate('template');
  assert.equal(manager.templates.functions.size, 0);
});
