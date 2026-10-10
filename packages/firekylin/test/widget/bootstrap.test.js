'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

test('worker bootstrap can be evaluated again with a retained registry', () => {
  const originalLoad = Module._load;
  const originalFirekylin = global.firekylin;
  const workerPath = path.join(__dirname, '..', '..', 'src', 'bootstrap', 'worker.js');

  Module._load = function(request, parent, isMain) {
    if (request === '../../lib/project-context') {
      return {getContext: () => ({config: {}, projectPath: '/tmp/firekylin-project'})};
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[workerPath];
    require(workerPath);
    delete require.cache[workerPath];
    assert.doesNotThrow(() => require(workerPath));
  } finally {
    Module._load = originalLoad;
    delete require.cache[workerPath];
    if (originalFirekylin === undefined) delete global.firekylin;
    else global.firekylin = originalFirekylin;
  }
});
