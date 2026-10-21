'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const AIProviderRegistry = require('../../src/ai/registry');
const AIClient = require('../../src/ai/client');
const {AIStore, encrypt, decrypt} = require('../../src/ai/store');

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
  registry.register({id: 'example', models: [{id: 'small'}], generate: request => ({text: request.messages[0].content})});
  let selected = {};
  const client = new AIClient({providers: registry, preferences: {
    get: async() => selected, set: async value => { selected = value }
  }});
  await client.select('example', 'small');
  assert.deepEqual(await client.generate({messages: [{role: 'user', content: 'hello'}]}), {text: 'hello'});
  await assert.rejects(() => client.select('example', 'missing'), /not available/);
});

test('AI credentials are encrypted, scoped and never returned with public options', async() => {
  const rows = {jwt_secret: 'test-secret-at-least-16-characters'};
  const store = new AIStore({
    getOptions: async includePrivate => includePrivate ? {...rows} : {},
    updateOptions: async(key, value) => { rows[key] = value }
  });
  await store.setCredential('provider', 'apiKey', 'sk-secret');
  assert.doesNotMatch(rows.ai_credentials, /sk-secret/);
  assert.equal(await store.getCredential('provider', 'apiKey'), 'sk-secret');
  assert.equal(await store.getCredential('other', 'apiKey'), undefined);
  const payload = encrypt('value', rows.jwt_secret);
  assert.equal(decrypt(payload, rows.jwt_secret), 'value');
  assert.throws(() => decrypt(payload, 'different-secret-value'), /auth|authenticate/i);
});
