const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const middleware = require('../src/middleware/i18n');
const {currentSnapshot} = require('../src/service/i18n');

class Controller {
  constructor() {
    this.ctx = {path: '/', url: '/', action: 'index', state: {}};
  }
  assign() {}
  redirect(location) {
    this.ctx.status = 302;
    this.ctx.redirectTo = location;
  }
}

global.think = {Controller, ROOT_PATH: path.resolve(__dirname, '..')};
const BaseController = require('../src/controller/base');

test('unconfigured and empty databases still reach the homepage installation redirect', async () => {
  for (const installed of [undefined, false]) {
    for (const message of ['Database configuration is missing', 'SQLITE_ERROR: no such table: fk_options']) {
      global.firekylin = {isInstalled: installed};
      const error = new Error(message);
      global.think.model = () => {
        if (message.startsWith('SQLITE_ERROR')) {
          return {getCredentialValue: async () => { throw error; }};
        }
        throw error;
      };
      const controller = new BaseController();
      controller.getWidget = async () => { throw error; };
      await middleware()(controller.ctx, async () => {
        assert.deepEqual(currentSnapshot(), {locale: 'zh-CN'});
        assert.equal(controller.ctx.state.t('保存'), '保存');
        await controller.__before();
      });
      assert.equal(controller.ctx.status, 302);
      assert.equal(controller.ctx.redirectTo, '/index/install');
      assert.equal(currentSnapshot(), undefined);
    }
  }
});

test('installed site database failures propagate without running downstream handlers', async () => {
  global.firekylin = {isInstalled: true};
  const error = new Error('Database connection refused');
  global.think.model = () => ({getCredentialValue: async () => { throw error; }});
  let called = false;
  await assert.rejects(middleware()({path: '/', state: {}}, () => { called = true; }), error);
  assert.equal(called, false);
});

test('the first successful request uses persisted language even before installation is confirmed', async () => {
  global.firekylin = {isInstalled: undefined};
  global.think.model = () => ({getCredentialValue: async () => 'en-US'});
  const ctx = {path: '/', state: {}};
  await middleware()(ctx, async () => {
    assert.equal(currentSnapshot().locale, 'en-US');
    assert.equal(ctx.state.t('保存'), 'Save');
  });
});

test('installation path does not require a database and downstream errors are not swallowed', async () => {
  global.think.model = () => { throw new Error('Must not query'); };
  let called = false;
  await middleware()({path: '/index/install'}, async () => { called = true; });
  assert.equal(called, true);
  global.firekylin = {isInstalled: false};
  const error = new Error('Downstream failure');
  await assert.rejects(middleware()({path: '/'}, async () => { throw error; }), error);
});
