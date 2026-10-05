'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('initializes the Vercel application before handling requests', async() => {
  const originalLoad = Module._load;
  const originalProjectPath = process.env.FIREKYLIN_PROJECT_PATH;
  const originalThink = global.think;
  let applicationOptions;
  let loaderOptions;
  let loaderType;
  let readyEvents = 0;
  let requests = 0;

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

  global.think = {
    beforeStartServer: () => Promise.resolve(),
    logger: {error: () => {}},
    app: {
      callback: () => () => {
        requests += 1;
        return Promise.resolve();
      },
      emit: event => {
        if (event === 'appReady') readyEvents += 1;
      }
    }
  };

  const entry = path.join(__dirname, '..', '..', 'index.js');
  try {
    delete require.cache[entry];
    const handler = require(entry);
    await Promise.all([handler({}, {}), handler({}, {})]);
  } finally {
    Module._load = originalLoad;
    delete require.cache[entry];
    if (originalProjectPath === undefined) delete process.env.FIREKYLIN_PROJECT_PATH;
    else process.env.FIREKYLIN_PROJECT_PATH = originalProjectPath;
    if (originalThink === undefined) delete global.think;
    else global.think = originalThink;
  }

  assert.equal(applicationOptions.RUNTIME_PATH, os.tmpdir());
  assert.equal(loaderOptions, applicationOptions);
  assert.equal(loaderType, 'worker');
  assert.equal(readyEvents, 1);
  assert.equal(requests, 2);
});
