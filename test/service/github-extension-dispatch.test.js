'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const {GitHubExtensionDispatch, validateChange, EVENT_TYPE} = require('../../src/service/github-extension-dispatch');

test('validates exact plugin and theme changes before any network request', () => {
  assert.deepEqual(validateChange({operation: 'plugin.install', name: 'firekylin-plugin-demo', version: '1.2.3',
    injected: 'ignored'}), {operation: 'plugin.install', name: 'firekylin-plugin-demo', version: '1.2.3'});
  assert.throws(() => validateChange({operation: 'plugin.install', name: 'not-trusted', version: '1.0.0'}));
  assert.throws(() => validateChange({operation: 'plugin.install', name: 'firekylin-plugin-demo', version: '^1.0.0'}));
  assert.throws(() => validateChange({operation: 'theme.install', name: 'x', id: '../x', version: '1.0.0',
    download: 'https://raw.githubusercontent.com/firekylin/themes/main/a.zip', integrity: 'sha512-nope'}));
});

test('checks workflow and submits a sanitized dispatch without returning credentials', async() => {
  const calls = [];
  const client = new GitHubExtensionDispatch({connection: {repository: 'owner/site', token: 'secret'},
    fetcher: async(url, options) => { calls.push({url, options}); return {ok: true, json: async() => ({
      encoding: 'base64', content: Buffer.from('firekylin-extension-update github-extension-apply.js').toString('base64')
    })} }});
  const result = await client.dispatch({operation: 'plugin.install', name: 'firekylin-plugin-demo', version: '1.0.0'});
  assert.equal(result.status, 'submitted');
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.match(calls[0].url, /contents\/\.github\/workflows\/firekylin-extensions.yml$/);
  assert.match(calls[1].url, /\/dispatches$/);
  assert.equal(calls[1].options.redirect, 'error');
  const payload = JSON.parse(calls[1].options.body);
  assert.equal(payload.event_type, EVENT_TYPE);
  assert.equal(payload.client_payload.change.version, '1.0.0');
  assert.equal(payload.client_payload.requestId, result.requestId);
});

test('does not dispatch when the repository workflow is missing', async() => {
  let calls = 0;
  const client = new GitHubExtensionDispatch({connection: {repository: 'owner/site', token: 'secret'},
    fetcher: async() => { calls++; return {ok: false} }});
  await assert.rejects(client.dispatch({operation: 'plugin.uninstall', name: 'firekylin-plugin-demo'}),
    /GITHUB_EXTENSION_WORKFLOW_MISSING/);
  assert.equal(calls, 1);
});
