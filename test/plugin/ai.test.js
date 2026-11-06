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

test('AI client rejects unsupported model capabilities before calling a provider', async() => {
  const registry = new AIProviderRegistry();
  let calls = 0;
  registry.register({
    id: 'text-only', models: [{id: 'chat', capabilities: ['text']}],
    generate: () => { calls++; return {text: 'OK'} }
  });
  const client = new AIClient({providers: registry, preferences: {
    get: async() => ({provider: 'text-only', model: 'chat'})
  }});
  await assert.rejects(client.generate({capability: 'image', messages: [{role: 'user', content: 'Draw a cat'}]}),
    {code: 'AI_UNSUPPORTED_CAPABILITY', status: 400,
      message: 'AI model does not support image: text-only/chat'});
  assert.equal(calls, 0);
  assert.deepEqual(await client.generate({messages: [{role: 'user', content: 'Hello'}]}), {text: 'OK'});
  assert.equal(calls, 1);
  registry.register({
    id: 'image-ready', models: [{id: 'draw', capabilities: ['image']}],
    generate: request => ({capability: request.capability})
  });
  assert.deepEqual(await client.generate({provider: 'image-ready', model: 'draw', capability: 'image',
    messages: [{role: 'user', content: 'Draw a cat'}]}), {capability: 'image'});
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
  const pluginAI = manager.context({manifest: {id: 'ai-test-plugin'}, root: process.cwd()}).ai;
  await pluginAI.clear();
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

test('content model bindings route each scenario, preserve explicit calls and reject stale or incompatible models', async() => {
  const registry = new AIProviderRegistry();
  let configured = true, bindings = {};
  for (const id of ['default', 'other']) registry.register({id,
    models: [{id: 'text', capabilities: ['text']}, {id: 'image', capabilities: ['image']}],
    configured: () => id === 'default' || configured,
    generate: request => ({provider: request.provider, model: request.model})});
  let selected = {provider: 'default', model: 'text'};
  const client = new AIClient({providers: registry,
    preferences: {get: async() => selected, set: async value => {selected = value}},
    featureModels: {get: async() => bindings, set: async value => {bindings = value}}});
  const features = ['title', 'summary', 'rewrite', 'translate', 'slug', 'category', 'autocomplete',
    'commentModeration', 'commentReply', 'image'];
  await client.setFeatureModels(Object.fromEntries(features.map(feature =>
    [feature, {provider: 'other', model: feature === 'image' ? 'image' : 'text'}])));
  const request = {messages: [{role: 'user', content: 'hello'}]};
  for (const scenario of ['editor.title', 'editor.summary', 'editor.review', 'editor.translate', 'editor.slug',
    'editor.category', 'editor.tags', 'editor.complete', 'comment.moderation', 'comment.reply']) {
    assert.deepEqual(await client.generate(request, {scenario}), {provider: 'other', model: 'text'}, scenario);
  }
  for (const scenario of ['editor.cover', 'media.image']) {
    assert.deepEqual(await client.generate({...request, capability: 'image'}, {scenario}),
      {provider: 'other', model: 'image'});
  }
  assert.deepEqual(await client.generate({...request, provider: 'default', model: 'text'}, {scenario: 'editor.title'}),
    {provider: 'default', model: 'text'});
  assert.deepEqual(await client.generate(request, {scenario: 'chat.reply'}), {provider: 'default', model: 'text'});
  await client.clear();
  assert.equal(await client.availableFeature('title'), true);
  assert.deepEqual(await client.generate(request, {scenario: 'editor.title'}), {provider: 'other', model: 'text'});
  await client.select('default', 'text');
  assert.equal(Object.keys(bindings).length, features.length);
  for (const invalid of [[], {unknown: {provider: 'other', model: 'text'}}, {title: null},
    {title: {provider: 'missing', model: 'text'}}, {title: {provider: 'other', model: 'missing'}},
    {image: {provider: 'other', model: 'text'}}, {summary: {provider: 'other', model: 'image'}}]) {
    await assert.rejects(client.setFeatureModels(invalid), {status: 400});
  }
  configured = false;
  assert.equal(await client.availableFeature('title'), false);
  await assert.rejects(client.generate(request, {scenario: 'editor.title'}), /not configured/);
  await assert.rejects(client.select('other', 'text'), {status: 400});
  await assert.rejects(client.setFeatureModels({title: {provider: 'other', model: 'text'}}), {status: 400});
  await client.setFeatureModels({});
  assert.deepEqual(await client.generate(request, {scenario: 'editor.title'}), {provider: 'default', model: 'text'});
});

test('removing a connection deletes only its key, clears its default and retains feature bindings across reloads', async() => {
  const {PluginManager} = require('../../src/plugin/manager');
  const rows = {jwt_secret: 'connection-test-secret-at-least-32-characters'};
  const store = new AIStore({getOptions: async() => ({...rows}),
    updateOptions: async(key, value) => {rows[key] = value},
    getCredentialValue: async key => rows[key], setCredentialValue: async(key, value) => {rows[key] = value},
    deleteCredentialValue: async key => {delete rows[key]}});
  const manager = new PluginManager({aiStore: store});
  for (const id of ['first', 'second']) {
    await store.setCredential(id, 'apiKey', `${id}-secret`);
    manager.aiProviders.register({id, models: [{id: 'text'}],
      configured: () => store.hasCredential(id, 'apiKey'), generate: () => ({text: id})}, id);
  }
  await manager.ai.select('first', 'text');
  await manager.ai.setFeatureModels({summary: {provider: 'first', model: 'text'}});
  await assert.rejects(manager.disconnectAI('missing'), {status: 400});
  await manager.disconnectAI('first');
  assert.equal(await store.hasCredential('first', 'apiKey'), false);
  assert.equal(await store.getCredential('second', 'apiKey'), 'second-secret');
  assert.deepEqual(await store.getPreferences(), {});
  assert.equal(manager.aiProviders.has('first'), true);
  assert.deepEqual(await store.getFeatureModels(), {summary: {provider: 'first', model: 'text'}});
  assert.equal((await manager.ai.models()).find(p => p.id === 'first').configured, false);
  await manager.ai.select('second', 'text');
  await assert.rejects(manager.ai.generate({messages: [{role: 'user', content: 'hello'}]},
    {scenario: 'editor.summary'}), /not configured/);
  await store.setCredential('first', 'apiKey', 'replacement');
  await manager.disconnectAI('first');
  assert.deepEqual(await store.getPreferences(), {provider: 'second', model: 'text'});
  const restarted = new PluginManager({aiStore: store});
  assert.deepEqual(await restarted.ai.getFeatureModels(), {summary: {provider: 'first', model: 'text'}});
});

test('providers with custom credential storage can implement disconnect', async() => {
  const {PluginManager} = require('../../src/plugin/manager');
  let configured = true;
  const manager = new PluginManager({aiStore: {getPreferences: async() => ({}), hasCredential: async() => false}});
  manager.aiProviders.register({id: 'custom', models: [{id: 'text'}], configured: () => configured,
    disconnect: async() => {configured = false}, generate() {}});
  assert.equal(await manager.canDisconnectAI(manager.aiProviders.get('custom')), true);
  await manager.disconnectAI('custom');
  assert.equal((await manager.ai.models())[0].configured, false);
});
