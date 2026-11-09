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

test('startup snapshot shares concurrent reads and missing keys, then expires', async() => {
  const model = new OptionsModel();
  let selects = 0;
  model.select = async() => {
    selects++;
    return [{key: 'plugin_state', value: 'enabled'}, {key: 'jwt_secret', value: 'secret'}];
  };
  model.where = () => ({find: async() => ({key: 'plugin_state', value: 'disabled'})});
  await model.withReadSnapshot(async() => {
    const [options, state, missing] = await Promise.all([
      model.getOptions(), model.getCredentialValue('plugin_state'), model.getCredentialValue('missing')
    ]);
    assert.equal(options.jwt_secret, undefined);
    assert.equal(state, 'enabled');
    assert.equal(missing, undefined);
    assert.equal((await model.getOptions(true)).jwt_secret, 'secret');
    assert.equal(selects, 1);
  });
  assert.equal(await model.getCredentialValue('plugin_state'), 'disabled');
  await model.getOptions();
  assert.equal(selects, 2);
});

test('snapshot retries failed reads and refreshes after writes', async() => {
  const model = new OptionsModel();
  let value = 'old';
  let fail = true;
  model.select = async() => {
    if (fail) { fail = false; throw new Error('unavailable') }
    return [{key: 'state', value}];
  };
  model.where = () => ({update: async data => { value = data.value; return 1 }});
  await model.withReadSnapshot(async() => {
    await assert.rejects(model.getOptions(), /unavailable/);
    assert.equal(await model.getCredentialValue('state'), 'old');
    await model.setCredentialValue('state', 'new');
    assert.equal(await model.getCredentialValue('state'), 'new');
  });
});
