'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {createRequire} = require('node:module');
const Koa = createRequire(require.resolve('thinkjs'))('koa');
const {cookie} = require('thinkjs/lib/extend/context');
const adminAuth = require('../../src/service/admin-auth');

test('initializes Vercel once and authenticates Cookies without a request socket', async() => {
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
  const koa = new Koa({proxy: true});
  const secret = 'vercel-cookie-regression-secret-32-bytes';
  const user = {id: 1, name: 'admin', type: 1};
  const token = adminAuth.sign(user, secret);

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
      request: koa.request,
      callback: () => async(req, res) => {
        requests += 1;
        const ctx = koa.createContext(req, res);
        ctx.cookie = cookie;
        ctx.config = () => ({signed: false});
        ctx.state.jwtSecret = secret;
        await Promise.resolve();
        if (req.detachSocket) req.socket = null;
        assert.equal(ctx.protocol, req.expectedProtocol);
        assert.equal(ctx.secure, req.expectedProtocol === 'https');
        assert.deepEqual(adminAuth.currentUser(ctx), req.authenticated ? user : null);
        if (req.authenticated) assert.equal(typeof adminAuth.csrfToken(ctx), 'string');
        if (req.socket) assert.equal(ctx.request.socket, req.socket);
        adminAuth.login(ctx, user, false);
        assert.match(res.getHeader('Set-Cookie')[0], /httponly/i);
        assert.equal(/; secure/i.test(res.getHeader('Set-Cookie')[0]), ctx.secure);
        adminAuth.logout(ctx);
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
    const cases = [
      {socket: null, forwarded: 'https', expectedProtocol: 'https', authenticated: true},
      {socket: undefined, forwarded: 'https, http', expectedProtocol: 'https'},
      {socket: null, expectedProtocol: 'http'},
      {socket: {encrypted: true}, forwarded: 'http', expectedProtocol: 'https', authenticated: true},
      {socket: {encrypted: false}, forwarded: 'https', expectedProtocol: 'https', detachSocket: true}
    ];
    for (const item of cases) {
      const headers = {};
      if (item.forwarded) headers['x-forwarded-proto'] = item.forwarded;
      if (item.authenticated) headers.cookie = 'thinkjs=' + token;
      const responseHeaders = new Map();
      const res = {getHeader: name => responseHeaders.get(name),
        setHeader: (name, value) => responseHeaders.set(name, value)};
      await secondHandler({...item, headers, url: '/oauth/authorize', method: 'GET'}, res);
    }

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
  assert.equal(requests, 5);
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
