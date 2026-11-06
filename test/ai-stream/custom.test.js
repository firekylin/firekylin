'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {streamResponse, consumeStream} = require('../../src/ai/stream');
const descriptor = (events, parser = {format: 'sse', parse: JSON.parse}) => streamResponse(new Response(
  events.map(event => 'data: '+JSON.stringify(event)+'\r\n\r\n').join('')), parser);
test('custom parser returns text, native/result usage, tools and completion with trailing usage', async() => {
  const deltas = [], reports = [];
  const toolCalls = [{id: 'call', name: 'posts.get', input: {id: 1}}];
  const result = await consumeStream(descriptor([
    {text: 'hello', usage: {tokens: 1}}, {toolCalls, done: true},
    {usage: {tokens: 2}, resultUsage: {total_tokens: 2}, providerData: {opaque: 'state'}}
  ]), {onText: delta => deltas.push(delta), reportUsage: raw => reports.push(raw)});
  assert.deepEqual(deltas, ['hello']);
  assert.deepEqual(result.toolCalls, toolCalls);
  assert.deepEqual(result.usage, {total_tokens: 2});
  assert.deepEqual(result.providerData, {opaque: 'state'});
  assert.deepEqual(reports.at(-1), {tokens: 2});
});
test('custom NDJSON parser receives final unterminated record and can finalize usage', async() => {
  const result = await consumeStream(streamResponse(new Response('{"text":"ok"}\n{"done":true}'), {
    format: 'ndjson', parse: JSON.parse, end: () => ({usage: {total_tokens: 1}})
  }));
  assert.equal(result.text, 'ok');
  assert.equal(result.usage.total_tokens, 1);
});
test('custom parser reports usage before an error and refuses missing completion', async() => {
  const reports = [];
  await assert.rejects(consumeStream(descriptor([{usage: {tokens: 2}, error: 'safe failure'}]), {
    reportUsage: raw => reports.push(raw)
  }), /safe failure/);
  assert.deepEqual(reports.at(-1), {tokens: 2});
  await assert.rejects(consumeStream(descriptor([{text: 'partial'}])), /interrupted/);
  await assert.rejects(consumeStream(descriptor([{text: 'partial', stop: true}])), /interrupted/);
  await assert.rejects(consumeStream(descriptor([{done: true}])), /no text/);
});
test('custom stop cancels the reader, invokes end once and does not process later frames', async() => {
  let cancelled = false, finalized = 0;
  const response = new Response(new ReadableStream({start(controller) {
    controller.enqueue(new TextEncoder().encode('data: {"text":"ok","done":true,"stop":true}\n\ndata: invalid\n\n'));
  }, cancel() {cancelled = true}}));
  const result = await consumeStream(streamResponse(response, {format: 'sse', parse: JSON.parse,
    end() {finalized++; return {usage: {tokens: 3}}}}));
  assert.equal(result.text, 'ok');
  assert.equal(cancelled, true);
  assert.equal(finalized, 1);
});
test('core enforces limits and event validation for custom parsers', async() => {
  for (const event of [
    {text: 'x'.repeat(200001)},
    {toolCalls: [{id: 'c', name: 'tool', input: {data: 'x'.repeat(200001)}}]},
    {providerData: {data: 'x'.repeat(200001)}}
  ]) await assert.rejects(consumeStream(descriptor([event])), /too large/);
  for (const event of [{text: 123}, {toolCalls: [{}]}, {providerData: []}]) {
    await assert.rejects(consumeStream(descriptor([event])), /Invalid/);
  }
  await assert.rejects(consumeStream(descriptor([{}], {format: 'sse', parse: async() => ({done: true})})), /Invalid/);
  await assert.rejects(consumeStream(streamResponse(new Response('data: '+'x'.repeat(2000001)), {
    format: 'sse', parse() {throw new Error('must not reach parser')}
  })), /too large/);
});
test('custom parser decoding preserves split UTF-8/CRLF and propagates parser failures', async() => {
  const bytes = new TextEncoder().encode('data: {"text":"你好","done":true}\r\n\r\n');
  const body = new ReadableStream({start(controller) {for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close()}});
  assert.equal((await consumeStream(streamResponse(new Response(body), {format: 'sse', parse: JSON.parse}))).text, '你好');
  let end = false;
  const error = new Error('parser failed');
  await assert.rejects(consumeStream(descriptor([{}], {format: 'sse', parse() {throw error}, end() {end = true}})), value => value === error);
  assert.equal(end, false);
});
test('custom parser cancellation closes stalled stream and does not finalize', async() => {
  const controller = new AbortController();
  let cancelled = false, finalized = false;
  const response = new Response(new ReadableStream({cancel() {cancelled = true}}));
  const pending = consumeStream(streamResponse(response, {format: 'sse', parse: JSON.parse, end() {finalized = true}}), {signal: controller.signal});
  controller.abort(new Error('cancel test'));
  await assert.rejects(pending, /cancel test/);
  assert.equal(cancelled, true);
  assert.equal(finalized, false);
});
test('default Chat Completions parser remains implicit and custom factories advertise support', async() => {
  assert.equal(streamResponse.supportsCustomParser, true);
  assert.equal((await consumeStream(streamResponse(new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n')))).text, 'ok');
  assert.throws(() => streamResponse(new Response(''), {format: 'xml', parse() {}}), /Invalid/);
});
test('custom callback failure closes the response and skips finalization', async() => {
  let cancelled = false, finalized = false;
  const response = new Response(new ReadableStream({start(controller) {
    controller.enqueue(new TextEncoder().encode('data: {"text":"ok"}\n\n'));
  }, cancel() {cancelled = true}}));
  const error = new Error('callback failed');
  await assert.rejects(consumeStream(streamResponse(response, {format: 'sse', parse: JSON.parse,
    end() {finalized = true}}), {onText() {throw error}}), value => value === error);
  assert.equal(cancelled, true);
  assert.equal(finalized, false);
});
test('AI client timeout covers a custom parser and preserves its native usage', async() => {
  const AIClient = require('../../src/ai/client');
  const Registry = require('../../src/ai/registry');
  const providers = new Registry();
  let cancelled = false, audit;
  providers.register({id: 'custom', models: [{id: 'model'}], usageAdapter: {protocol: 'chat-completions'},
    generate: (_, ctx) => ctx.streamResponse(new Response(new ReadableStream({start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"usage":{"completion_tokens":2},"text":"partial"}\n\n'));
    }, cancel() {cancelled = true}})), {format: 'sse', parse: JSON.parse})});
  const client = new AIClient({providers, timeout: 30, preferences: {get: async() => ({provider: 'custom', model: 'model'})},
    audit: {start: async() => ({}), resolve: async() => {}, finish: async(_, state) => {audit = state}}});
  await assert.rejects(client.generate({messages: [{role: 'user', content: 'hi'}]}), /timed out/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(cancelled, true);
  assert.equal(audit.timeout, true);
  assert.equal(audit.usageMetadata.usageDetails.outputTokens, 2);
});
