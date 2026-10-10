'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('initializes the Vercel application once across entry reloads', async() => {
  const originalLoad = Module._load;
  const originalProjectPath = process.env.FIREKYLIN_PROJECT_PATH;
  const originalThink = global.think;
  const handlerKey = Symbol.for('firekylin.vercel.handler');
  let applicationOptions;
  let applications = 0;
  let loaderOptions;
  let loaderType;
  let loaders = 0;
  let readyEvents = 0;
  let requests = 0;

  class Application {
    constructor(options) {
      applications += 1;
      applicationOptions = options;
      this.options = options;
    }
  }

  class Loader {
    constructor(options) {
      loaders += 1;
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
    delete global[handlerKey];
    delete require.cache[entry];
    const firstHandler = require(entry);
    delete require.cache[entry];
    const secondHandler = require(entry);
    await Promise.all([firstHandler({}, {}), secondHandler({}, {})]);

    assert.equal(firstHandler, secondHandler);
  } finally {
    Module._load = originalLoad;
    delete require.cache[entry];
    delete global[handlerKey];
    if (originalProjectPath === undefined) delete process.env.FIREKYLIN_PROJECT_PATH;
    else process.env.FIREKYLIN_PROJECT_PATH = originalProjectPath;
    if (originalThink === undefined) delete global.think;
    else global.think = originalThink;
  }

  assert.equal(applicationOptions.RUNTIME_PATH, os.tmpdir());
  assert.equal(applications, 1);
  assert.equal(loaderOptions, applicationOptions);
  assert.equal(loaders, 1);
  assert.equal(loaderType, 'worker');
  assert.equal(readyEvents, 1);
  assert.equal(requests, 2);
});

test('uses JSON errors without loading theme configuration on Vercel', () => {
  const originalThink = global.think;
  const middlewarePath = path.join(__dirname, '..', '..', 'src', 'config', 'middleware.js');

  global.think = {
    env: 'vercel',
    isCli: false,
    isPrevent: () => false,
    ROOT_PATH: '/tmp/firekylin-package'
  };

  let middleware;
  try {
    delete require.cache[middlewarePath];
    middleware = require(middlewarePath);
  } finally {
    delete require.cache[middlewarePath];
    if (originalThink === undefined) delete global.think;
    else global.think = originalThink;
  }

  const trace = middleware.find(item => item.handle === 'trace');
  assert.equal(trace.options.templates, undefined);
  assert.equal(trace.options.contentType({}), 'json');
});
