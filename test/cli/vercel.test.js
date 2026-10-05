'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('uses the writable temporary directory for Vercel runtime files', () => {
  const originalLoad = Module._load;
  const originalProjectPath = process.env.FIREKYLIN_PROJECT_PATH;
  let applicationOptions;
  let loaderOptions;
  let loaderType;

  class Application {
    constructor(options) {
      applicationOptions = options;
      this.options = options;
    }
  }

  class Loader {
    constructor(options) {
      loaderOptions = options;
    }

    loadAll(type) {
      loaderType = type;
    }
  }

  Module._load = function(request, parent, isMain) {
    if (request === 'thinkjs') return Application;
    if (request === 'thinkjs/lib/loader') return Loader;
    if (request === './lib/project-context') {
      return {findProjectPath: () => '/tmp/firekylin-project'};
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const entry = path.join(__dirname, '..', '..', 'index.js');
  try {
    delete require.cache[entry];
    require(entry);
  } finally {
    Module._load = originalLoad;
    delete require.cache[entry];
    if (originalProjectPath === undefined) delete process.env.FIREKYLIN_PROJECT_PATH;
    else process.env.FIREKYLIN_PROJECT_PATH = originalProjectPath;
  }

  assert.equal(applicationOptions.RUNTIME_PATH, os.tmpdir());
  assert.equal(loaderOptions, applicationOptions);
  assert.equal(loaderType, 'worker');
});
