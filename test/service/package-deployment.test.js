'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {GithubDeploymentAdapter, createDeploymentAdapter, validateChange} =
  require('../../src/service/package-deployment');

test('dispatches a validated package change without exposing the token in the body', async() => {
  let request;
  const adapter = new GithubDeploymentAdapter({repository: 'firekylin/site', token: 'secret',
    fetcher: async(url, options) => { request = {url, options}; return {ok: true, status: 204} }});
  const result = await adapter.deploy({operation: 'plugin.install', name: '@firekylin/plugin-marketplace',
    version: '1.2.3'});
  assert.equal(request.url, 'https://api.github.com/repos/firekylin/site/dispatches');
  assert.equal(request.options.redirect, 'error');
  assert.equal(JSON.parse(request.options.body).client_payload.version, '1.2.3');
  assert.doesNotMatch(request.options.body, /secret/);
  assert.equal(result.deploymentRequired, true);
});

test('supports the Vercel Git adapter and rejects unsafe changes', () => {
  assert.equal(createDeploymentAdapter({type: 'vercel-git', repository: 'owner/blog', token: 'x'}).provider,
    'vercel-git');
  assert.throws(() => validateChange({operation: 'plugin.install', name: 'left-pad', version: '1.0.0'}),
    /UNTRUSTED/);
  assert.throws(() => validateChange({operation: 'theme.install', id: 'theme', version: '1.0.0',
    download: 'http://example.com/a.zip', integrity: 'sha512-AAAA'}), /HTTPS/);
});

test('reports GitHub dispatch failures', async() => {
  const adapter = new GithubDeploymentAdapter({repository: 'owner/blog', token: 'x',
    fetcher: async() => ({ok: false, status: 403})});
  await assert.rejects(adapter.deploy({operation: 'plugin.uninstall', name: 'firekylin-plugin-backup'}),
    /DEPLOYMENT_DISPATCH_403/);
});
