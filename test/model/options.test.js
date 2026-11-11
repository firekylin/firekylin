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
const optionsCache = require('../../src/service/options-cache');
test.beforeEach(() => optionsCache.entries.clear());

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

test('all model instances share concurrent and subsequent reads, including missing keys', async() => {
  let selects = 0;
  const makeModel = () => {
    const model = new OptionsModel();
    model.select = async() => {
      selects++;
      return [{key: 'state', value: 'enabled'}, {key: 'jwt_secret', value: 'secret'}];
    };
    return model;
  };
  const [options, state, missing] = await Promise.all([
    makeModel().getOptions(), makeModel().getCredentialValue('state'), makeModel().getCredentialValue('missing')
  ]);
  assert.equal(options.jwt_secret, undefined);
  assert.equal(state, 'enabled');
  assert.equal(missing, undefined);
  assert.equal((await makeModel().getOptions(true)).jwt_secret, 'secret');
  assert.equal(selects, 1);
});

test('writes invalidate globally so other model instances see updates', async() => {
  let value = 'old';
  const reader = new OptionsModel();
  reader.select = async() => [{key: 'state', value}];
  const writer = new OptionsModel();
  writer.where = () => ({update: async data => { value = data.value; return 1 }});
  assert.equal(await reader.getCredentialValue('state'), 'old');
  await writer.setCredentialValue('state', 'new');
  assert.equal(await reader.getCredentialValue('state'), 'new');
});

test('ORM write hooks preserve parent behavior and invalidate the shared cache', async() => {
  for (const hook of ['afterAdd', 'afterUpdate', 'afterDelete']) {
    const parent = think.Model.prototype;
    parent[hook] = async data => data;
    try {
      let value = 'old';
      const reader = new OptionsModel();
      reader.select = async() => [{key: 'state', value}];
      optionsCache.entries.clear();
      assert.equal(await reader.getCredentialValue('state'), 'old');
      value = 'new';
      assert.equal(await new OptionsModel()[hook]('parent result'), 'parent result');
      assert.equal(await reader.getCredentialValue('state'), 'new');
    } finally { delete parent[hook] }
  }
});
