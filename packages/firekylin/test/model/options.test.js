'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.think = {
  Model: class {},
  isObject: value => Object.prototype.toString.call(value) === '[object Object]',
  extend: Object.assign
};

const OptionsModel = require('../../src/model/options');

test('options model uses the key column as its primary key', () => {
  assert.equal(new OptionsModel().pk, 'key');
});

test('options model inserts when PostgreSQL count returns the string zero', async() => {
  const model = new OptionsModel();
  let inserted;

  model.where = () => ({
    count: async() => '0',
    update: async() => assert.fail('a missing option must not be updated')
  });
  model.add = async data => {
    inserted = data;
  };
  model.getOptions = async() => ({});

  await model.updateOptions('themeConfig', '{"customCSS":"body{}"}');

  assert.deepEqual(inserted, {
    key: 'themeConfig',
    value: '{"customCSS":"body{}"}'
  });
});
