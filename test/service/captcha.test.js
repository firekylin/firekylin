'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {settings, enabled, publicSettings, verify} = require('../../src/service/captcha');

test('captcha defaults to disabled and exposes only public settings', () => {
  assert.equal(enabled(settings({}), 'login'), false);
  assert.deepEqual(settings({}).areas, ['login', 'comment']);
  assert.deepEqual(publicSettings({}).areas, ['login', 'comment']);
  assert.deepEqual(settings({captcha: {areas: []}}).areas, []);
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
    const recaptcha = {...config, provider: 'recaptcha-v3'};
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

test('login template bootstraps public captcha settings without a secret', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const template = fs.readFileSync(path.resolve(__dirname, '../../view/admin.eta'), 'utf8');
  const expression = template.match(/options: <%~ ([\s\S]*?) %>,/)[1];
  for (const provider of ['none', 'turnstile', 'recaptcha-v3']) {
    const config = {provider, siteKey: 'public-key', secret: 'private-key', areas: ['login', 'comment']};
    const bootstrap = JSON.parse(vm.runInNewContext(expression, {
      firekylin: {options: {captcha: config}, publicCaptcha: publicSettings(config)}
    }));
    assert.equal(bootstrap.captcha.provider, provider);
    assert.equal(bootstrap.captcha.siteKey, 'public-key');
    assert.deepEqual(bootstrap.captcha.areas, ['login', 'comment']);
    assert.equal(bootstrap.captcha.secret, undefined);
    assert.equal(JSON.stringify(bootstrap).includes('private-key'), false);
  }
});
