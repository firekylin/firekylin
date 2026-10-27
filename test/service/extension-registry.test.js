'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {trustedUrl, normalizeSettings, readSettings, fetchRegistry, MAX_BYTES} = require('../../src/service/extension-registry');

function response(body, options = {}) {
  return new Response(body, {status: options.status || 200, headers: options.headers});
}
test('accepts only trusted HTTPS registry locations and rejects unsafe redirects', async() => {
  for (const url of ['http://firekylin.lithub.cc/plugins/r', 'https://127.0.0.1/r',
    'https://raw.githubusercontent.com/other/repo/main/registry.json',
    'https://user@firekylin.lithub.cc/plugins/r', 'https://firekylin.lithub.cc:444/plugins/r',
    'https://firekylin.lithub.cc/plugins-other', 'https://firekylin.lithub.cc/plugins/../private',
    'https://firekylin.lithub.cc/plugins/%2fprivate', 'https://plugins.firekylin.com/r']) {
    assert.throws(() => trustedUrl(url), /UNTRUSTED/);
  }
  assert.equal(trustedUrl('https://firekylin.lithub.cc/plugins').href, 'https://firekylin.lithub.cc/plugins');
  assert.equal(trustedUrl('https://firekylin.lithub.cc/plugins/registry.json').pathname, '/plugins/registry.json');
  await assert.rejects(fetchRegistry('https://firekylin.lithub.cc/plugins/r', {
    fetcher: async() => response(null, {status: 302, headers: {location: 'http://127.0.0.1/'}})
  }), /UNTRUSTED/);
});
test('loads and filters registry entries and validates schema', async() => {
  const body = JSON.stringify({schemaVersion: 1, packages: [{type: 'theme', name: 'a', version: '1.0.0'},
    {type: 'plugin', name: 'b', version: '1.0.0'}, {type: 'theme'}]});
  const items = await fetchRegistry('https://firekylin.lithub.cc/plugins/r', {fetcher: async() => response(body)});
  assert.equal(items.length, 2);
  await assert.rejects(fetchRegistry('https://firekylin.lithub.cc/plugins/r', {
    fetcher: async() => response('{"schemaVersion":2,"packages":[]}')
  }), /INVALID_REGISTRY/);
});
test('enforces registry byte limits without trusting content-length', async() => {
  let cancelled = false;
  const stream = new ReadableStream({pull(controller) { controller.enqueue(new Uint8Array(MAX_BYTES + 1)) },
    cancel() { cancelled = true }});
  await assert.rejects(fetchRegistry('https://firekylin.lithub.cc/plugins/r', {
    fetcher: async() => response(stream)
  }), /REGISTRY_TOO_LARGE/);
  assert.equal(cancelled, true);
});
test('keeps plugin and theme URLs independently configurable', () => {
  const value = normalizeSettings({pluginRegistry: 'https://firekylin.lithub.cc/plugins/p',
    themeRegistry: 'https://firekylin.lithub.cc/plugins/t'});
  assert.equal(value.pluginRegistry, 'https://firekylin.lithub.cc/plugins/p');
  assert.equal(value.themeRegistry, 'https://firekylin.lithub.cc/plugins/t');
  assert.deepEqual(readSettings({extension_registry_settings: JSON.stringify(value)}), value);
});
