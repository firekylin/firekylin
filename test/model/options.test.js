'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.think = {
  Model: class {},
  isEmpty: value => !value || Object.keys(value).length === 0,
  isObject: value => Object.prototype.toString.call(value) === '[object Object]',
  isString: value => typeof value === 'string',
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

test('options model only exposes comment internals to explicit callers', async() => {
  const model = new OptionsModel();
  model.select = async() => [
    {key: 'site_url', value: 'https://example.com'},
    {key: 'jwt_secret', value: 'shared-secret'},
    {key: 'comment_jwt_secret', value: 'secret'},
    {key: 'comment_schema_version', value: '1'}
  ];

  const publicOptions = await model.getOptions();
  assert.equal(publicOptions.jwt_secret, undefined);
  assert.equal(publicOptions.comment_jwt_secret, undefined);
  assert.equal(publicOptions.comment_schema_version, undefined);

  const privateOptions = await model.getOptions(true);
  assert.equal(privateOptions.jwt_secret, 'shared-secret');
  assert.equal(privateOptions.comment_jwt_secret, 'secret');
  assert.equal(privateOptions.comment_schema_version, '1');
});
