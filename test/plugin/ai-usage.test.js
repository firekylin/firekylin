'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createUsageAdapter, sumTokens, chatUsage, responsesUsage} = require('../../src/ai/usage');
test('missing, invalid and zero values remain distinct; totals require both counts', () => {
  for (const value of [undefined, null, -1, NaN, Infinity, 1.5, '4']) {
    const result = chatUsage.metadata({prompt_tokens: value, completion_tokens: 2}).usageDetails;
    assert.equal(result.inputTokens, null);
    assert.equal(result.totalTokens, null);
  }
  assert.equal(chatUsage.metadata({prompt_tokens: 0, completion_tokens: 0}).usageDetails.totalTokens, 0);
  assert.equal(chatUsage.metadata({total_tokens: 9}).usageDetails.totalTokens, 9);
  assert.equal(sumTokens(Number.MAX_SAFE_INTEGER, 1), null);
  assert.equal(sumTokens(3, null), null);
});
test('protocol mappings retain cache and reasoning details without adding them to totals again', () => {
  const chat = chatUsage.metadata({prompt_tokens: 10, completion_tokens: 4,
    prompt_tokens_details: {cached_tokens: 6}, completion_tokens_details: {reasoning_tokens: 2}}).usageDetails;
  assert.deepEqual(chat, {inputTokens: 10, outputTokens: 4, totalTokens: 14,
    cacheReadTokens: 6, cacheWriteTokens: null, reasoningTokens: 2});
  const response = responsesUsage.metadata({input_tokens: 10, output_tokens: 4,
    input_tokens_details: {cached_tokens: 6}, output_tokens_details: {reasoning_tokens: 2}}).usageDetails;
  assert.deepEqual(response, chat);
});
test('declarations support custom accessors, fallback paths and immutable independent mappings', () => {
  const fields = {inputTokens: ['primary', 'fallback'], outputTokens: u => sumTokens(u.visible, u.hidden ?? 0)};
  const adapter = createUsageAdapter(fields, {requestIdHeaders: ['custom-request-id']});
  fields.inputTokens.push('should-not-read');
  fields.outputTokens = () => 999;
  const result = adapter.metadata({fallback: 0, visible: 2, hidden: 3},
    {headers: new Headers({'custom-request-id': 'id', Authorization: 'do-not-return'})});
  assert.equal(result.usageDetails.inputTokens, 0);
  assert.equal(result.usageDetails.totalTokens, 5);
  assert.equal(result.providerRequestId, 'id');
  assert.equal(result.headers, undefined);
  assert.equal(adapter.metadata({'should-not-read': 4, visible: 1}).usageDetails.inputTokens, null);
  assert.equal(chatUsage.metadata({primary: 4}).usageDetails.inputTokens, null);
});
test('declarations inherit protocols, sum only available counters and snapshot nested selectors', () => {
  const {usageAdapter} = require('../../src/ai/usage');
  const declaration = {protocol: 'responses', fields: {
    inputTokens: {sum: ['base', {field: 'cache', default: 0}]},
    cacheReadTokens: ['cache', 'cached']
  }};
  const adapter = usageAdapter(declaration);
  declaration.fields.inputTokens.sum.push('not-in-original');
  declaration.fields.cacheReadTokens.push('other');
  assert.equal(adapter.metadata({base: 2, output_tokens: 3}).usageDetails.totalTokens, 5);
  assert.equal(adapter.metadata({output_tokens: 3}).usageDetails.inputTokens, null);
  assert.equal(adapter.metadata({base: 2, cache: -1}).usageDetails.inputTokens, null);
  assert.equal(adapter.metadata({base: 2, other: 9}).usageDetails.cacheReadTokens, null);
  assert.throws(() => usageAdapter({protocol: 'unknown'}), /Unknown AI usage protocol/);
});

const AIClient = require('../../src/ai/client');
const Registry = require('../../src/ai/registry');
const {Audit} = require('../../src/service/ai-audit');
const request = {messages: [{role: 'user', content: 'hello'}]};
const response = {headers: new Headers({'x-request-id': 'upstream', Authorization: 'never-store'})};
function setup(generate, timeout = 100) {
  const rows = [];
  const audit = new Audit({model: () => ({
    add: async row => {rows.push({...row}); return rows.length},
    where: ({id}) => ({update: async patch => Object.assign(rows[id - 1], patch)})
  })});
  const providers = new Registry();
  providers.register({id: 'test', models: [{id: 'small'}], usageAdapter: {protocol: 'chat-completions'}, generate});
  return {rows, providers, client: new AIClient({providers, audit, timeout,
    preferences: {get: async() => ({provider: 'test', model: 'small'})}})};
}
test('core normalizes reported usage, preserves legacy usage and stores only selected metadata', async() => {
  const raw = {prompt_tokens: 0, completion_tokens: 2};
  const {client, rows, providers} = setup((_, {reportUsage}) => {
    reportUsage(undefined, response);
    reportUsage(raw, response);
    return {text: 'answer', usage: raw};
  });
  const result = await client.generate(request);
  assert.equal(result.usage, raw);
  assert.equal(result.usageDetails.totalTokens, 2);
  assert.equal(result.providerRequestId, 'upstream');
  assert.equal(rows[0].total_tokens, 2);
  assert.equal(rows[0].provider_request_id, 'upstream');
  assert.equal(rows[0].status, 'success');
  assert.equal(JSON.stringify(rows).includes('never-store'), false);
  assert.equal(providers.list()[0].usageAdapter, undefined);
  assert.equal(providers.list()[0].usage, undefined);
});
test('reported usage survives original immutable errors without altering the thrown error', async() => {
  const original = Object.freeze(new Error('no output'));
  const {client, rows} = setup((_, {reportUsage}) => {
    reportUsage({prompt_tokens: 3, completion_tokens: 1}, response);
    throw original;
  });
  await assert.rejects(client.generate(request), error => error === original);
  assert.equal(rows[0].status, 'failure');
  assert.equal(rows[0].total_tokens, 4);
  assert.equal(rows[0].provider_request_id, 'upstream');
});
test('timeout keeps previously reported usage and ignores late reports', async() => {
  let report;
  const {client, rows} = setup((_, {reportUsage}) => {
    report = reportUsage;
    report({prompt_tokens: 3, completion_tokens: 1}, response);
    return new Promise(() => {});
  }, 10);
  await assert.rejects(client.generate(request), /timed out/);
  report({prompt_tokens: 900, completion_tokens: 100}, response);
  assert.equal(rows[0].status, 'timeout');
  assert.equal(rows[0].total_tokens, 4);
});
test('concurrent calls keep reports isolated and cancellation retains known usage', async() => {
  const controller = new AbortController();
  const {client, rows} = setup((req, {reportUsage}) => {
    reportUsage({prompt_tokens: req.count, completion_tokens: 0}, response);
    if (req.count === 7) { controller.abort(); return new Promise(() => {}) }
    return {text: 'done'};
  });
  const results = await Promise.allSettled([
    client.generate({...request, count: 7}, {signal: controller.signal}),
    client.generate({...request, count: 2})
  ]);
  assert.equal(results[0].status, 'rejected');
  assert.equal(results[1].value.usageDetails.totalTokens, 2);
  assert.deepEqual(rows.map(row => [row.status, row.total_tokens]), [['cancelled', 7], ['success', 2]]);
});
