'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {PluginManager} = require('../../src/plugin/manager');
const {Audit} = require('../../src/service/ai-audit');
const context = require('../../src/service/ai-audit-context');
const auth = require('../../src/service/admin-auth');
const httpContext = require('../../src/middleware/ai-audit');
const routes = require('../../src/plugin/middleware');
test('plugin calls inherit verified user and registered connection-test scenario; body cannot forge identity', async t => {
  const rows = [];
  const audit = new Audit({model: () => ({add: async row => {rows.push(row); return rows.length},
    where: ({id}) => ({update: async patch => Object.assign(rows[id - 1], patch)})}),
  options: () => ({getOptions: async() => ({})})});
  const manager = new PluginManager({aiAudit: audit, aiStore: {getPreferences: async() => ({provider: 'demo', model: 'small'})}});
  const plugin = manager.context({manifest: {id: 'provider-plugin'}});
  plugin.ai.registerProvider({id: 'demo', models: [{id: 'small'}], admin: {formId: 'settings', testActionId: 'test'},
    generate: async() => {await new Promise(resolve => setImmediate(resolve)); return {text: 'OK'}}});
  plugin.admin.registerAction({id: 'test', label: 'Test', handler: input => plugin.ai.generate({messages: [{role: 'user', content: 'hi'}],
    user: input.user}, {pluginId: 'forged', actor_id: 999})});
  const old = global.firekylin;
  t.after(() => {global.firekylin = old});
  global.firekylin = {plugins: manager};
  const secret = 'plugin-audit-context-test-secret-32-bytes';
  const cookie = auth.sign({id: 7, name: 'Administrator', type: 1}, secret);
  const ctx = {method: 'POST', path: '/admin/api/plugins/provider-plugin/actions/test',
    request: {body: {post: {user: {id: 999, name: 'forged'}}}}, state: {jwtSecret: secret},
    cookie: () => cookie, get: () => auth.csrfToken(ctx),
    throw(status) {throw Object.assign(new Error('denied'), {status})}};
  await httpContext()(ctx, () => routes()(ctx, () => {}));
  assert.equal(rows[0].actor_id, 7);
  assert.equal(rows[0].actor_name, 'Administrator');
  assert.equal(rows[0].plugin_id, 'provider-plugin');
  assert.equal(rows[0].scenario, 'connection.test');
  assert.equal(rows[0].source, 'admin');
  await plugin.ai.generate({messages: [{role: 'user', content: 'task'}]});
  assert.equal(rows[1].actor_name, '系统任务');
  assert.equal(rows[1].scenario, 'unspecified');
  assert.equal(rows[1].plugin_id, 'provider-plugin');
  await context.run({source: 'mcp', user: () => ({id: 8, name: 'MCP user'})}, () => plugin.ai.generate({messages: [{role: 'user', content: 'tool'}]}));
  assert.equal(rows[2].actor_id, 8);
  assert.equal(rows[2].source, 'mcp');
});
