'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {Audit, usage, textContent, requestText} = require('../../src/service/ai-audit');
const context = require('../../src/service/ai-audit-context');
const AIClient = require('../../src/ai/client');
const Registry = require('../../src/ai/registry');
function setup(generate, recordContent = false, timeout = 100) {
  const rows = [], diagnostics = [];
  const options = {getOptions: async() => ({ai_audit_settings: JSON.stringify({recordContent})})};
  const model = () => ({add: async row => {rows.push({...row, id: rows.length + 1}); return rows.length},
    where: ({id}) => ({update: async patch => Object.assign(rows[id - 1], patch)})});
  const audit = new Audit({model, options: () => options, logger: {error: line => diagnostics.push(line)}});
  const providers = new Registry();
  providers.register({id: 'test', models: [{id: 'small'}], generate});
  const client = new AIClient({providers, preferences: {get: async() => ({provider: 'test', model: 'small'})}, audit, timeout});
  return {client, audit, rows, diagnostics, options};
}
const request = {messages: [{role: 'user', content: 'hello'}]};
test('records success metadata, trusted identity, related calls, native usage and zero values', async() => {
  const result = {text: 'answer', usage: {prompt_tokens: 0, completion_tokens: 2}, providerRequestId: 'req-provider'};
  const {client, rows} = setup(() => result);
  await context.run({source: 'admin', user: () => ({id: 3, name: 'Author'})}, async() => {
    assert.equal(await client.generate({...request, user: {id: 99}}, {scenario: 'editor.translate'}), result);
    await client.generate(request, {scenario: 'editor.translate'});
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, 'success');
  assert.equal(rows[0].actor_id, 3);
  assert.equal(rows[0].actor_name, 'Author');
  assert.equal(rows[0].source, 'admin');
  assert.equal(rows[0].correlation_id, rows[1].correlation_id);
  assert.notEqual(rows[0].request_id, rows[1].request_id);
  assert.equal(rows[0].input_tokens, 0);
  assert.equal(rows[0].total_tokens, 2);
  assert.equal(rows[0].request_text, 'hello');
  assert.equal(rows[0].response_text, 'answer');
  assert.equal(rows[0].provider_request_id, 'req-provider');
});
test('concurrent async contexts stay isolated; system and anonymous calls are explicit', async() => {
  const {client, rows} = setup(async() => {await new Promise(resolve => setTimeout(resolve, 5)); return {text: 'ok'}});
  await Promise.all([1, 2].map(id => context.run({source: 'admin', user: () => ({id, name: `user${id}`})}, () => client.generate(request))));
  assert.deepEqual(rows.map(row => row.actor_id), [1, 2]);
  assert.notEqual(rows[0].correlation_id, rows[1].correlation_id);
  await client.generate(request);
  await context.run({source: 'http'}, () => client.generate(request));
  assert.equal(rows[2].actor_name, '系统任务');
  assert.equal(rows[3].actor_name, '未知');
});
test('failure preserves original error but never stores its message', async() => {
  const error = Object.assign(new Error('Authorization: secret-user-article'), {providerRequestId: 'failed-id', usageDetails: {inputTokens: 3, outputTokens: 0, totalTokens: 3}});
  const {client, rows} = setup(() => {throw error}, true);
  await assert.rejects(client.generate(request), e => e === error);
  assert.equal(rows[0].status, 'failure');
  assert.equal(rows[0].error_category, 'provider_error');
  assert.equal(rows[0].provider_request_id, 'failed-id');
  assert.equal(rows[0].total_tokens, 3);
  assert.equal(rows[0].response_text, null);
  assert.ok(!JSON.stringify(rows).includes('secret-user-article'));
});
test('timeout and caller cancellation are recorded separately', async() => {
  const generate = (_, {signal}) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {once: true});
    if (signal.aborted) reject(signal.reason);
  });
  const {client, rows} = setup(generate, false, 5);
  await assert.rejects(client.generate(request), /timed out/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(client.generate(request, {signal: controller.signal}));
  assert.deepEqual(rows.map(row => row.status), ['timeout', 'cancelled']);
});
test('unsettled calls leave unfinished rows and persistence failures cannot change results', async() => {
  let release;
  const {client, rows, audit, diagnostics} = setup(() => new Promise(resolve => {release = resolve}));
  const pending = client.generate(request);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  assert.equal(rows[0].status, 'unfinished');
  release({text: 'OK'});
  await pending;
  audit.model = () => {throw new Error('database password sensitive text')};
  const failStart = await audit.start(request, {});
  assert.equal(failStart, null);
  assert.deepEqual(diagnostics, ['[ai-audit] start failed']);
  const result = {text: 'still works'};
  const fixture = setup(() => result);
  fixture.audit.model = audit.model;
  assert.equal(await fixture.client.generate(request), result);
  const failure = setup(() => {throw new Error('original')});
  failure.audit.model = audit.model;
  await assert.rejects(failure.client.generate(request), /original/);
  const updateFailure = setup(() => result);
  const original = updateFailure.audit.model;
  updateFailure.audit.model = () => ({...original(), where: () => ({update: async() => {throw new Error('secret')}})});
  assert.equal(await updateFailure.client.generate(request), result);
  assert.equal(updateFailure.rows[0].status, 'unfinished');
});
test('records text by default, ignoring retired settings; redacts and truncates Unicode', async() => {
  const {client, rows, options} = setup(() => ({text: 'sk-abcdefghijklmnop ' + '字'.repeat(10001)}));
  await client.generate(request);
  options.getOptions = async() => ({ai_audit_settings: '{"recordContent":true}'});
  await client.generate({messages: [{role: 'user', content: [
    {type: 'text', text: 'Authorization: Bearer secret\nhello'}, {type: 'image_url', image_url: {url: 'data:image/png;base64,secret'}}
  ]}]});
  assert.equal(rows[0].content_recorded, 1);
  assert.equal(rows[1].content_recorded, 1);
  assert.ok(!rows[1].request_text.includes('secret'));
  assert.ok(!rows[1].response_text.includes('sk-'));
  assert.equal(rows[1].response_truncated, 1);
  assert.equal(Array.from(rows[1].response_text).length, 10000);
  assert.equal(requestText({messages: [{content: [{type: 'image', data: 'secret'}]}]}), '');
  assert.equal(textContent('data:image/png;base64,AAAA').text, '[BINARY OMITTED]');
  assert.ok(!textContent('Cookie: session=one; another=two').text.includes('two'));
});
test('unknown usage stays null, supplied metadata is authoritative and details are not added twice', () => {
  assert.equal(usage().total_tokens, null);
  assert.equal(usage({usage: {prompt_tokens: 5}}).total_tokens, null);
  assert.equal(usage({usage: {prompt_tokens: 0, completion_tokens: 0}}).total_tokens, 0);
  assert.equal(usage({usage: {prompt_tokens: 99}, usageDetails: {inputTokens: null}}).input_tokens, null);
  assert.equal(usage({usage: {prompt_tokens: 5, completion_tokens: 3, prompt_tokens_details: {cached_tokens: 4}}}).total_tokens, 8);
});

test('timeout completes when a provider ignores cancellation and null exceptions stay failures', async() => {
  const never = setup(() => new Promise(() => {}), false, 5);
  await assert.rejects(never.client.generate(request), /timed out/);
  assert.equal(never.rows[0].status, 'timeout');
  const nullError = setup(() => {throw null});
  try {await nullError.client.generate(request); assert.fail('must reject')} catch (error) {assert.equal(error, null)}
  assert.equal(nullError.rows[0].status, 'failure');
});

test('request context preserves business parameters and excludes secrets, headers and binary content', async() => {
  const {client, rows} = setup(() => ({text: 'done'}));
  await context.run({source: 'admin', user: () => ({id: 4, name: 'user'}), request: () => ({
    url: '/admin/api/ai-editor?access_token=private&operation=title', method: 'POST',
    headers: {Authorization: 'do-not-save'}, parameters: {operation: 'title', content: 'article',
      password: 'hidden', nested: {apiKey: 'hidden', count: 2}, images: ['binary'], maxOutputTokens: 300},
  })}, () => client.generate(request));
  const stored = JSON.parse(rows[0].request_context);
  assert.equal(stored.method, 'POST');
  assert.equal(stored.source, 'admin');
  assert.equal(stored.parameters.content, 'article');
  assert.equal(stored.parameters.maxOutputTokens, 300);
  assert.equal(stored.parameters.nested.count, 2);
  assert.equal(stored.parameters.nested.apiKey, '[REDACTED]');
  assert.equal(stored.parameters.password, '[REDACTED]');
  assert.equal(stored.headers, undefined);
  assert.equal(stored.parameters.images, undefined);
  assert.ok(!rows[0].request_context.includes('private'));
  assert.equal(stored.generation.messages[0].content, 'hello');
});
test('context JSON remains valid under truncation and cyclic or image values', () => {
  const {sanitizeContext} = require('../../src/service/ai-audit-request');
  const input = {text: 'a'.repeat(10001), image: {type: 'image', data: 'do-not-save'}};
  input.cycle = input;
  const cleaned = sanitizeContext(input);
  assert.equal(cleaned.context_truncated, true);
  assert.ok(cleaned.text.endsWith('[TRUNCATED]'));
  assert.ok(!JSON.stringify(cleaned).includes('do-not-save'));
});
