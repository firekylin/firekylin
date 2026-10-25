'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../../www/static/js/captcha.js'), 'utf8');

test('login captcha expires, resets and removes its widget', async() => {
  let options;
  const calls = [];
  global.document = {createElement: () => ({}), head: {appendChild: script => script.onload()}};
  global.window = {turnstile: {
    render: (_target, value) => { options = value; return 'widget'; },
    reset: id => calls.push(['reset', id]), remove: id => calls.push(['remove', id])
  }};
  try {
    const runtime = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#login`);
    const states = [];
    const controller = await runtime.mount({provider: 'turnstile', siteKey: 'key', theme: 'dark', language: 'en'}, {isConnected: true}, value => states.push(value));
    assert.equal(options.theme, 'dark');
    options.callback('token');
    assert.equal(await controller.getToken(), 'token');
    options['expired-callback']();
    assert.equal(await controller.getToken(), '');
    controller.reset(); controller.destroy();
    assert.deepEqual(calls, [['reset', 'widget'], ['remove', 'widget']]);
  } finally { delete global.document; delete global.window }
});
test('comment captcha renders before hidden submit and hands a single-use token to Waline', async() => {
  let options;
  const classes = new Set();
  global.document = {createElement: () => ({setAttribute() {}}), head: {appendChild: script => script.onload()}};
  global.window = {turnstile: {render: (_target, value) => { options = value; return 'widget'; }, reset() {}}};
  try {
    const runtime = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#comment`);
    const container = {after() {}, classList: {add: name => classes.add(name), remove: name => classes.delete(name)}};
    await runtime.prepareWaline({provider: 'turnstile', siteKey: 'key', hideSubmit: true}, container);
    assert.equal(classes.has('fk-captcha-pending'), true);
    options.callback('token');
    assert.equal(classes.has('fk-captcha-pending'), false);
    let token;
    window.turnstile.render('.wl-captcha-container', {sitekey: 'key', callback: value => {token = value;}});
    assert.equal(token, 'token');
    assert.equal(classes.has('fk-captcha-pending'), true);
  } finally { delete global.document; delete global.window }
});
