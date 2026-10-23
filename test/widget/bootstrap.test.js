'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ToolRegistry = require('../../src/plugin/tools');

test('worker bootstrap can be evaluated again with a retained registry', () => {
  const originalLoad = Module._load;
  const originalFirekylin = global.firekylin;
  const originalThink = global.think;
  const migrationKey = Symbol.for('firekylin.commentSchemaMigration');
  const categoryMigrationKey = Symbol.for('firekylin.categorySchemaMigration');
  const oauthKey = Symbol.for('firekylin.mcp.oauthMigration');
  const auditMigrationKey = Symbol.for('firekylin.aiAuditMigration');
  const originalAuditMigration = global[auditMigrationKey];
  const originalOAuthMigration = global[oauthKey];
  const originalMigration = global[migrationKey];
  const originalCategoryMigration = global[categoryMigrationKey];
  const workerPath = path.join(__dirname, '..', '..', 'src', 'bootstrap', 'worker.js');
  let managerInstances = 0;
  let pluginLoads = 0;
  const startHooks = [];

  class PluginManager {
    constructor() {
      managerInstances += 1;
      this.events = {emit() {}};
      this.abilities = new ToolRegistry();
      this.tools = this.abilities;
    }

    async load() {
      pluginLoads += 1;
    }
  }

  Module._load = function(request, parent, isMain) {
    if (request === '../../lib/project-context') {
      return {getContext: () => ({config: {}, projectPath: '/tmp/firekylin-project'})};
    }
    if (request === '../plugin/manager') return {PluginManager};
    return originalLoad.call(this, request, parent, isMain);
  };
  global.think = {beforeStartServer: hook => startHooks.push(hook)};
  delete global[migrationKey];
  delete global[categoryMigrationKey];
  delete global[oauthKey];
  delete global[auditMigrationKey];

  try {
    delete require.cache[workerPath];
    require(workerPath);
    const firstManager = global.firekylin.plugins;
    assert.equal(startHooks.length, 4);
    delete require.cache[workerPath];
    assert.doesNotThrow(() => require(workerPath));
    assert.equal(global.firekylin.plugins, firstManager);
    assert.equal(managerInstances, 1);
    assert.equal(pluginLoads, 1);
    assert.equal(startHooks.length, 4);
    assert.equal(firstManager.tools, firstManager.abilities);
    assert.equal(firstManager.tools.list().length, 26);
    assert.ok(firstManager.tools.has('posts.create_draft', 'core:management'));
    assert.ok(firstManager.tools.has('comments.moderate', 'core:management'));
    assert.ok(firstManager.tools.has('settings.update', 'core:management'));
    assert.ok(firstManager.tools.has('media.upload', 'core:media'));
  } finally {
    if (originalAuditMigration === undefined) delete global[auditMigrationKey];
    else global[auditMigrationKey] = originalAuditMigration;
    if (originalOAuthMigration === undefined) delete global[oauthKey];
    else global[oauthKey] = originalOAuthMigration;
    Module._load = originalLoad;
    delete require.cache[workerPath];
    if (originalFirekylin === undefined) delete global.firekylin;
    else global.firekylin = originalFirekylin;
    if (originalThink === undefined) delete global.think;
    else global.think = originalThink;
    if (originalMigration === undefined) delete global[migrationKey];
    else global[migrationKey] = originalMigration;
    if (originalCategoryMigration === undefined) delete global[categoryMigrationKey];
    else global[categoryMigrationKey] = originalCategoryMigration;
  }
});
