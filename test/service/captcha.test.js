'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {settings, enabled, publicSettings, verify} = require('../../src/service/captcha');

test('captcha defaults to disabled and exposes only public settings', () => {
  assert.equal(enabled(settings({}), 'login'), false);
  assert.equal(publicSettings({secret: 'private'}).secret, undefined);
});
test('captcha enforces selected areas and fails closed on missing keys or network errors', async() => {
  const config = {provider: 'turnstile', areas: ['login'], secret: 'private'};
  assert.equal(await verify(config, '', '', 'comment', {}), true);
  assert.equal(await verify(config, '', '', 'login', {}), false);
  assert.equal(await verify({...config, secret: ''}, 'token', '', 'login', {}), false);
  const previous = global.fetch;
  try {
    global.fetch = async() => { throw new Error('offline') };
    assert.equal(await verify(config, 'token', '', 'login'), false);
    global.fetch = async(_url, request) => {
      assert.equal(request.body.get('secret'), 'private');
      return {ok: true, json: async() => ({success: true})};
    };
    assert.equal(await verify(config, 'token', '', 'login'), true);
    const recaptcha = {...config, provider: 'recaptcha'};
    assert.equal(await verify(recaptcha, 'token', '', 'login'), false);
    global.fetch = async() => ({ok: true, json: async() => ({success: true, score: 0.9, action: 'social'})});
    assert.equal(await verify(recaptcha, 'token', '', 'login'), false);
    assert.equal(await verify({...recaptcha, areas: ['comment']}, 'token', '', 'comment'), true);
  } finally { global.fetch = previous }
});

test('public options hide captcha secrets while retaining private values', async() => {
  global.think = {Model: class {}, isString: value => typeof value === 'string', isEmpty: value => !Object.keys(value).length};
  // Load the model with its unrelated AI-store dependency stubbed.
  const Module = require('node:module');
  const load = Module._load;
  let Options;
  try {
    Module._load = function(id, ...args) {
      if (id === '../ai/store') return {CREDENTIAL_PREFIX: 'ai_credential:'};
      return load.call(this, id, ...args);
    };
    Options = require('../../src/model/options');
  } finally { Module._load = load }
  const model = new Options();
  model.select = async() => [
    {key: 'captcha', value: JSON.stringify({provider: 'turnstile', siteKey: 'public', secret: 'private', areas: ['login']})},
    {key: 'comment', value: '{}'}
  ];
  const publicValue = await model.getOptions();
  assert.equal(publicValue.captcha.secret, undefined);
  const privateValue = await model.getOptions(true);
  assert.equal(privateValue.captcha.secret, 'private');
});
