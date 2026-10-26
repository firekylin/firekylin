'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const reactPackage = path.dirname(require.resolve('@better-captcha/react'));
const providerURL = name => pathToFileURL(require.resolve(`@better-captcha/core/providers/${name}`, {paths: [reactPackage]})).href;

test('better-captcha v3 executes login action and refreshes response for each submission', async() => {
  const {ReCaptchaV3Provider} = await import(providerURL('recaptcha-v3'));
  const original = global.window;
  let calls = 0;
  global.window = {grecaptcha: {
    ready: callback => callback(),
    execute: async(sitekey, options) => {
      assert.equal(sitekey, 'public-key');
      assert.equal(options.action, 'login');
      return `token-${++calls}`;
    }
  }};
  try {
    const provider = new ReCaptchaV3Provider('public-key', {autoLoad: false});
    const id = await provider.render({}, {action: 'login'});
    const handle = provider.getHandle(id);
    await handle.execute();
    assert.equal(handle.getResponse(), 'token-2');
    handle.reset();
    assert.equal(handle.getResponse(), '');
    await handle.execute();
    assert.equal(handle.getResponse(), 'token-3');
    handle.destroy();
    assert.equal(handle.getResponse(), '');
  } finally {global.window = original;}
});
