'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {AIRuntime} = require('../../src/ai/runtime');
const {createOpenAICompatibleProvider, normalizeBaseUrl} = require('../../src/ai/openai-compatible');

test('runtime supports plugin providers and removes them on unload', async() => {
  const runtime = new AIRuntime();
  runtime.registerProvider('example', {
    generate: async({messages}) => ({text: 'reply: ' + messages[1].content})
  }, 'demo');
  const summary = await runtime.runTask('post.summary', 'Article content', {
    provider: 'example', model: 'sample-model'
  });
  assert.equal(summary.text, 'reply: Article content');
  assert.equal(summary.task, 'post.summary');
  runtime.removePlugin('demo');
  await assert.rejects(runtime.runTask('post.summary', 'hello', {
    provider: 'example', model: 'sample-model'
  }), /Unknown AI provider/);
});

test('AI tasks reject malformed and excessively large content', async() => {
  const runtime = new AIRuntime();
  runtime.registerProvider('demo', {generate: async() => ({text: 'ok'})});
  const config = {provider: 'demo', model: 'test'};
  await assert.rejects(runtime.runTask('post.summary', '', config), /Invalid AI content/);
  await assert.rejects(runtime.runTask('post.summary', 'a'.repeat(40001), config), /Invalid AI content/);
  await assert.rejects(runtime.runTask('unknown', 'Hello', config), /Unsupported AI task/);
});

test('provider uses configured OpenAI-compatible endpoint without exposing key', async() => {
  const calls = [];
  const provider = createOpenAICompatibleProvider({
    baseUrl: 'https://models.example/v1/',
    apiKey: 'my-secret',
    fetchImpl: async(url, request) => {
      calls.push({url, request});
      return {
        ok: true,
        async json() {
          return {choices: [{message: {content: 'Output'}}], usage: {total_tokens: 50}};
        }
      };
    }
  });
  const result = await provider.generate({
    model: 'test-model', messages: [{role: 'user', content: 'Hello'}]
  });
  assert.equal(result.text, 'Output');
  assert.equal(calls[0].url, 'https://models.example/v1/chat/completions');
  assert.equal(calls[0].request.headers.authorization, 'Bearer my-secret');
  assert.equal(JSON.parse(calls[0].request.body).stream, false);
});

test('provider errors omit upstream response bodies and configuration credentials', async() => {
  const provider = createOpenAICompatibleProvider({
    baseUrl: 'https://models.example/v1',
    fetchImpl: async() => ({ok: false, status: 401})
  });
  await assert.rejects(provider.generate({model: 'test', messages: []}), /request failed \(401\)/);
  assert.throws(() => normalizeBaseUrl('file:///etc/passwd'), /Invalid AI API endpoint/);
  assert.throws(() => normalizeBaseUrl('https://user:pass@example.com'), /Invalid AI API endpoint/);
});
