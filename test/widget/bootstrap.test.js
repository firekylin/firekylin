'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

test('worker bootstrap can be evaluated again with a retained registry', () => {
  const originalLoad = Module._load;
  const originalFirekylin = global.firekylin;
  const workerPath = path.join(__dirname, '..', '..', 'src', 'bootstrap', 'worker.js');
  let managerInstances = 0;
  let pluginLoads = 0;

  class PluginManager {
    constructor() {
      managerInstances += 1;
      this.events = {emit() {}};
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

  try {
    delete require.cache[workerPath];
    require(workerPath);
    const firstManager = global.firekylin.plugins;
    delete require.cache[workerPath];
    assert.doesNotThrow(() => require(workerPath));
    assert.equal(global.firekylin.plugins, firstManager);
    assert.equal(managerInstances, 1);
    assert.equal(pluginLoads, 1);
  } finally {
    Module._load = originalLoad;
    delete require.cache[workerPath];
    if (originalFirekylin === undefined) delete global.firekylin;
    else global.firekylin = originalFirekylin;
  }
});
