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

test('AI admin shows installed providers and changes default only when explicitly submitted', async() => {
  const {PluginManager} = require('../../src/plugin/manager');
  let selected = {};
  const manager = new PluginManager({aiStore: {
    getPreferences: async() => selected,
    setPreferences: async value => { selected = value }
  }});
  manager.aiProviders.register({
    id: 'deepseek', label: 'DeepSeek', models: [{id: 'deepseek-flash'}],
    configured: async() => true, generate: () => ({text: 'OK'})
  }, 'ai-provider-deepseek');
  manager.aiProviders.register({
    id: 'openai', label: 'OpenAI', models: [{id: 'gpt-small'}],
    configured: async() => false, generate: () => ({text: 'OK'})
  }, 'ai-provider-openai');
  manager.admin.registerPanel({id: 'connection', title: 'DeepSeek'}, 'ai-provider-deepseek');
  manager.admin.registerPage({id: 'settings', panel: 'connection', title: '设置', load: () => ({})},
    'ai-provider-deepseek');
  const {registerAIAdmin} = require('../../src/ai/admin');
  registerAIAdmin(manager);
  const page = await manager.admin.loadPage('core-ai', 'connections');
  assert.equal(page.content.sections[0].items[0].value, '未选择');
  assert.equal(page.content.sections[1].items[0].href, '/admin/plugins/ai-provider-deepseek/settings');
  assert.match(page.content.sections[1].items[0].description, /已配置/);
  assert.match(page.content.sections[1].items[1].description, /未配置/);
  assert.deepEqual(selected, {});
  assert.deepEqual(manager.admin.manifest().find(item => item.id === 'core-ai').forms[0].fields[0].options,
    [{label: 'DeepSeek / deepseek-flash', value: 'deepseek/deepseek-flash'},
      {label: 'OpenAI / gpt-small', value: 'openai/gpt-small'}]);
  await manager.admin.submitForm('core-ai', 'default-model', {selection: 'deepseek/deepseek-flash'});
  assert.deepEqual(selected, {provider: 'deepseek', model: 'deepseek-flash'});
  await assert.rejects(() => manager.admin.submitForm('core-ai', 'default-model', {
    selection: 'unknown/model'
  }), /Invalid AI provider\/model selection/);
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
