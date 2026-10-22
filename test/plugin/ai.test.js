'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const AIProviderRegistry = require('../../src/ai/registry');
const AIClient = require('../../src/ai/client');
const {AIStore, credentialKey, encrypt, decrypt} = require('../../src/ai/store');

test('AI provider registry exposes metadata and removes plugin providers', () => {
  const registry = new AIProviderRegistry();
  registry.register({
    id: 'example', label: 'Example', description: 'Example provider',
    logo: 'https://example.com/logo.svg', models: [{id: 'small'}], generate() {}
  }, 'plugin');
  assert.deepEqual(registry.list(), [{id: 'example', label: 'Example',
    description: 'Example provider', logo: 'https://example.com/logo.svg', models: [
    {id: 'small', label: 'small', capabilities: ['text']}
  ]}]);
  registry.removeOwner('plugin');
  assert.equal(registry.has('example'), false);
  assert.throws(() => registry.register({id: 'bad', models: [{id: 'small'}],
    admin: {formId: '../other', testActionId: 'test'}, generate() {}}, 'plugin'),
  /Invalid AI provider admin configuration/);
  assert.throws(() => registry.register({id: 'unsafe', logo: 'javascript:alert(1)',
    models: [{id: 'small'}], generate() {}}, 'plugin'), /logo must be an HTTPS/);
  assert.throws(() => registry.register({id: 'insecure', logo: 'http://example.com/logo.svg',
    models: [{id: 'small'}], generate() {}}, 'plugin'), /logo must be an HTTPS/);
  assert.throws(() => registry.register({id: 'ambiguous', logo: '/\\example.com/logo.svg',
    models: [{id: 'small'}], generate() {}}, 'plugin'), /logo must be an HTTPS/);
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

test('AI service lists providers without registering a second admin page', async() => {
  const {PluginManager} = require('../../src/plugin/manager');
  let selected = {};
  const manager = new PluginManager({aiStore: {
    getPreferences: async() => selected,
    setPreferences: async value => { selected = value }
  }});
  manager.aiProviders.register({
    id: 'deepseek', label: 'DeepSeek', models: [{id: 'deepseek-flash'}],
    admin: {formId: 'settings', testActionId: 'test-connection'},
    configured: async() => true, generate: () => ({text: 'OK'})
  }, 'ai-provider-deepseek');
  manager.aiProviders.register({
    id: 'openai', label: 'OpenAI', models: [{id: 'gpt-small'}],
    configured: async() => false, generate: () => ({text: 'OK'})
  }, 'ai-provider-openai');
  const providers = await manager.ai.models();
  assert.equal(providers[0].configured, true);
  assert.deepEqual(providers[0].admin, {
    pluginId: 'ai-provider-deepseek', formId: 'settings', testActionId: 'test-connection'
  });
  assert.equal(providers[1].configured, false);
  assert.equal(manager.admin.manifest().some(item => item.id === 'core-ai'), false);
  assert.deepEqual(selected, {});
  await manager.ai.select('deepseek', 'deepseek-flash');
  assert.deepEqual(selected, {provider: 'deepseek', model: 'deepseek-flash'});
  await manager.ai.clear();
  assert.deepEqual(selected, {});
  assert.equal((await manager.ai.models())
    .some(provider => provider.models.some(model => model.selected)), false);
  await assert.rejects(() => manager.ai.generate({messages: [{role: 'user', content: 'hello'}]}),
    /Provider must be a non-empty string/);
  await assert.rejects(() => manager.ai.select('unknown', 'model'), /not available/);
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
