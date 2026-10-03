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

test('base controller does not eagerly query widget data', async() => {
  const queriedModels = [];
  const controller = new BaseController();
  controller.model = name => {
    queriedModels.push(name);
    if (name !== 'options') throw new Error(`Unexpected eager model: ${name}`);
    return {
      async getOptions() {
        return {
          comment: {name: '{}'},
          navigation: '[]',
          theme: 'firekylin',
          themeConfig: '{}'
        };
      }
    };
  };

  await controller.__before();
  assert.deepEqual(queriedModels, ['options']);
  assert.equal(typeof controller.data.widget, 'function');
  assert.equal(typeof controller.data.widget.destroy, 'function');

  await controller.displayView('index');
  assert.equal(controller.ctx.body.categories, undefined);
  assert.equal(controller.ctx.body.tags, undefined);
  assert.equal(controller.ctx.body.lastPostList, undefined);
  assert.equal(controller.ctx.body.widget, undefined);
});
