const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

class Controller {
  constructor() {
    this.data = {};
    this.ctx = {
      action: 'index',
      body: null,
      host: 'example.com',
      hostname: 'example.com',
      url: '/index.json'
    };
  }

  assign(name, value) {
    if (typeof name === 'undefined') return this.data;
    if (typeof name === 'object') {
      Object.assign(this.data, name);
      return;
    }
    if (typeof value === 'undefined') return this.data[name];
    this.data[name] = value;
  }
}

global.think = {
  Controller,
  env: 'development',
  ROOT_PATH: path.join(__dirname, '../..')
};
global.firekylin = {isInstalled: true};

const {registerWidgetMap} = require('../../src/widget/registry');
const widgets = require('../../src/widget');
const BaseController = require('../../src/controller/base');

registerWidgetMap(widgets);

test('base controller reuses options widget data and checks installation separately', async() => {
  const queriedModels = [];
  const controller = new BaseController();
  controller.service = name => {
    assert.equal(name, 'install');
    return {checkInstalled: async() => true};
  };
  controller.model = name => {
    queriedModels.push(name);
    if (name !== 'options') throw new Error(`Unexpected eager model: ${name}`);
    return {
      async getOptions() {
        return {
          comment: {name: '{}'},
          navigation: '[]',
          jwt_secret: 'controller-test-secret-with-at-least-32-bytes',
          site_url: 'https://example.com',
          theme: 'firekylin',
          themeConfig: '{}'
        };
      }
    };
  };

  await controller.__before();
  assert.deepEqual(queriedModels, ['options']);
  assert.equal(controller.ctx.state.jwtSecret, 'controller-test-secret-with-at-least-32-bytes');
  assert.equal(typeof controller.data.widget, 'function');
  assert.equal(typeof controller.data.widget.destroy, 'function');

  await controller.displayView('index');
  assert.equal(controller.ctx.body.categories, undefined);
  assert.equal(controller.ctx.body.tags, undefined);
  assert.equal(controller.ctx.body.lastPostList, undefined);
  assert.equal(controller.ctx.body.widget, undefined);
});


test('default site_url without users redirects to the installer and permits recovery', async() => {
  for (const action of ['index', 'install']) {
    const controller = new BaseController();
    controller.ctx.action = action;
    controller.getWidget = async() => ({row: {site_url: 'http://127.0.0.1:8360'}});
    controller.service = () => ({checkInstalled: async() => false});
    let redirected;
    controller.redirect = url => {redirected = url};
    await controller.__before();
    assert.equal(global.firekylin.isInstalled, false);
    assert.equal(redirected, action === 'index' ? '/index/install' : undefined);
  }
});
