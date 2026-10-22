'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const AIProviderRegistry = require('../../src/ai/registry');
const AIClient = require('../../src/ai/client');
const {AIStore, credentialKey, encrypt, decrypt} = require('../../src/ai/store');

test('AI provider registry exposes metadata and removes plugin providers', () => {
  const registry = new AIProviderRegistry();
  registry.register({
    id: 'example', label: 'Example', models: [{id: 'small'}], generate() {}
  }, 'plugin');
  assert.deepEqual(registry.list(), [{id: 'example', label: 'Example', models: [
    {id: 'small', label: 'small', capabilities: ['text']}
  ]}]);
  registry.removeOwner('plugin');
  assert.equal(registry.has('example'), false);
});

test('AI client validates selection and delegates generation', async() => {
  const registry = new AIProviderRegistry();
  registry.register({
    id: 'example', models: [{id: 'small'}], generate: request => ({text: request.messages[0].content})
  });
  let selected = {};
  const client = new AIClient({providers: registry, preferences: {
    get: async() => selected, set: async value => { selected = value }
  }});
  await client.select('example', 'small');
  assert.deepEqual(await client.generate({messages: [{role: 'user', content: 'hello'}]}), {text: 'hello'});
  await assert.rejects(() => client.select('example', 'missing'), /not available/);
});

test('AI client combines caller cancellation and timeout', async() => {
  const registry = new AIProviderRegistry();
  registry.register({
    id: 'example', models: [{id: 'small'}],
    generate: (_, {signal}) => new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      signal.addEventListener('abort', () => reject(signal.reason), {once: true});
    })
  });
  const preferences = {get: async() => ({provider: 'example', model: 'small'})};
  const client = new AIClient({providers: registry, preferences, timeout: 10});
  const caller = new AbortController();
  await assert.rejects(client.generate({messages: [{role: 'user', content: 'hello'}]}, {
    signal: caller.signal
  }), /timed out/);

  const clientWithLongTimeout = new AIClient({providers: registry, preferences, timeout: 1000});
  const pending = clientWithLongTimeout.generate({messages: [{role: 'user', content: 'hello'}]}, {
    signal: caller.signal
  });
  caller.abort(new Error('Caller cancelled'));
  await assert.rejects(pending, /Caller cancelled/);
});

test('AI credentials are encrypted, scoped and never returned with public options', async() => {
  const rows = {jwt_secret: 'test-secret-at-least-16-characters'};
  const store = new AIStore({
    getOptions: async includePrivate => includePrivate ? {...rows} : {},
    updateOptions: async(key, value) => { rows[key] = value },
    getCredentialValue: async key => rows[key],
    setCredentialValue: async(key, value) => { rows[key] = value },
    deleteCredentialValue: async key => { delete rows[key] }
  });
  await store.setCredential('provider', 'apiKey', 'sk-secret');
  assert.doesNotMatch(rows[credentialKey('provider', 'apiKey')], /sk-secret/);
  assert.equal(await store.getCredential('provider', 'apiKey'), 'sk-secret');
  assert.equal(await store.getCredential('other', 'apiKey'), undefined);
  await Promise.all([
    store.setCredential('provider', 'second', 'another-secret'),
    store.setCredential('other', 'apiKey', 'third-secret')
  ]);
  assert.equal(await store.getCredential('provider', 'second'), 'another-secret');
  assert.equal(await store.getCredential('other', 'apiKey'), 'third-secret');
  await store.deleteCredential('provider', 'apiKey');
  assert.equal(await store.getCredential('provider', 'apiKey'), undefined);
  assert.equal(await store.getCredential('other', 'apiKey'), 'third-secret');
  const payload = encrypt('value', rows.jwt_secret);
  assert.equal(decrypt(payload, rows.jwt_secret), 'value');
  assert.throws(() => decrypt(payload, 'different-secret-value'), /auth|authenticate/i);
});
