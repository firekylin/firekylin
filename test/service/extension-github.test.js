'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {ExtensionGitHub, repositoryName, inspectRepository} = require('../../src/service/extension-github');

function model() {
  const rows = new Map();
  return {rows, getOptions: async() => ({jwt_secret: 'test-secret-at-least-16-characters'}),
    getCredentialValue: async key => rows.get(key), setCredentialValue: async(key, value) => rows.set(key, value),
    deleteCredentialValue: async key => rows.delete(key)};
}
function github(repository = 'owner/site', permissions = {push: true}) {
  return async(url, options) => {
    assert.equal(url, `https://api.github.com/repos/${repository}`);
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.authorization, 'Bearer private-token');
    return {ok: true, json: async() => ({full_name: repository, permissions})};
  };
}

test('restricts repositories to canonical GitHub repository URLs', () => {
  assert.equal(repositoryName('https://github.com/owner/site.git'), 'owner/site');
  for (const url of ['http://github.com/owner/site', 'https://github.com.attacker/owner/site',
    'https://github.com/owner/site/extra', 'https://user:pass@github.com/owner/site',
    'https://github.com/owner/site?redirect=1', 'https://github.com/owner/%2fsite']) {
    assert.throws(() => repositoryName(url), /INVALID_GITHUB_REPOSITORY/);
  }
});
test('encrypts connection, masks secret in status, validates before replacing, and disconnects', async() => {
  const db = model();
  const client = new ExtensionGitHub(db, github());
  assert.deepEqual(await client.status(), {connected: false});
  assert.deepEqual(await client.save('https://github.com/owner/site', 'private-token'),
    {connected: true, repository: 'https://github.com/owner/site'});
  assert.equal(JSON.stringify([...db.rows]).includes('private-token'), false);
  assert.deepEqual(await client.status(), {connected: true, repository: 'https://github.com/owner/site'});
  await client.save('https://github.com/owner/site', '');
  await assert.rejects(client.save('https://github.com/other/site', ''), /INVALID_GITHUB_TOKEN/);
  assert.equal((await client.status()).repository, 'https://github.com/owner/site');
  await client.disconnect();
  assert.deepEqual(await client.status(), {connected: false});
});
test('rejects missing write access and remote errors without echoing credentials', async() => {
  await assert.rejects(inspectRepository('owner/site', 'private-token', github('owner/site', {push: false})),
    /GITHUB_REPOSITORY_NOT_WRITABLE/);
  await assert.rejects(inspectRepository('owner/site', 'private-token', async() => ({ok: false, status: 401})),
    /GITHUB_REPOSITORY_ACCESS_FAILED/);
});

test('replaces credentials after an encryption key change without decrypting the old token', async() => {
  const db = model();
  let secret = 'original-key-at-least-16-characters';
  db.getOptions = async() => ({jwt_secret: secret});
  const client = new ExtensionGitHub(db, github());
  await client.save('https://github.com/owner/site', 'private-token');
  secret = 'replacement-key-at-least-16-characters';
  await assert.rejects(client.status());
  await assert.rejects(client.save('https://github.com/owner/site', ''));
  await client.save('https://github.com/owner/site', 'private-token');
  assert.deepEqual(await client.status(), {connected: true, repository: 'https://github.com/owner/site'});
});
