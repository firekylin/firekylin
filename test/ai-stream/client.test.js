'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const AIClient = require('../../src/ai/client');
const Registry = require('../../src/ai/registry');
const {streamResponse, consumeStream} = require('../../src/ai/stream');
const encode = value => new TextEncoder().encode(`data: ${typeof value === 'string' ? value : JSON.stringify(value)}\n\n`);
function response(events) {
  return new Response(new ReadableStream({start(controller) {
    for (const event of events) controller.enqueue(encode(event));
    controller.close();
  }}), {headers: {'content-type': 'text/event-stream', 'x-request-id': 'req-stream'}});
}
function setup(generate, timeout = 1000) {
  const providers = new Registry(), audits = [];
  providers.register({id: 'test', models: [{id: 'model', capabilities: ['text', 'stream']}],
    usageAdapter: {protocol: 'chat-completions'}, generate});
  const client = new AIClient({providers, timeout, preferences: {get: async() => ({provider: 'test', model: 'model'})},
    audit: {start: async() => ({}), resolve: async() => {}, finish: async(_, state) => audits.push(state)}});
  return {client, audits};
}
const request = {messages: [{role: 'user', content: 'hi'}]};
test('core consumes the stream before completing audit and returns no response objects', async() => {
  const deltas = [];
  const {client, audits} = setup(async(req, context) => {
    assert.equal(audits.length, 0);
    return {...context.streamResponse(response([
      {choices: [{delta: {content: 'hello'}, finish_reason: 'stop'}]},
      {usage: {prompt_tokens: 3, completion_tokens: 2}}, '[DONE]'
    ]), 'chat-completions'), provider: req.provider, model: req.model};
  });
  const result = await client.generate(request, {onText: value => {assert.equal(audits.length, 0); deltas.push(value)}});
  assert.deepEqual(deltas, ['hello']);
  assert.equal(result.text, 'hello');
  assert.equal(result.stream, undefined);
  assert.equal(result.protocol, undefined);
  assert.equal(result.providerRequestId, 'req-stream');
  assert.equal(audits.length, 1);
  assert.equal(audits[0].usageMetadata.usageDetails.outputTokens, 2);
});
for (const mode of ['timeout', 'cancel']) test(`core ${mode} closes a stalled stream and retains prior usage`, async() => {
  let closed = false, received;
  const started = new Promise(resolve => {received = resolve});
  const caller = new AbortController();
  const {client, audits} = setup(async(_, context) => context.streamResponse(new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(encode({usage: {completion_tokens: 2}}));
      controller.enqueue(encode({choices: [{delta: {content: 'partial'}}]}));
    }, cancel() {closed = true}
  })), 'chat-completions'), mode === 'timeout' ? 30 : 1000);
  const pending = client.generate(request, {signal: caller.signal, onText: received});
  await started;
  if (mode === 'cancel') caller.abort(new Error('caller cancelled'));
  await assert.rejects(pending, /timed out|caller cancelled/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(closed, true);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].usageMetadata.usageDetails.outputTokens, 2);
  assert.equal(Boolean(audits[0][mode === 'timeout' ? 'timeout' : 'cancelled']), true);
});
test('core keeps legacy result and callback providers compatible', async() => {
  const {client} = setup(async(_, context) => {context.onText('legacy'); return {text: 'legacy'}});
  const deltas = [];
  assert.deepEqual(await client.generate(request, {onText: text => deltas.push(text)}), {text: 'legacy'});
  assert.deepEqual(deltas, ['legacy']);
});
test('Responses preserves tool calls and encrypted continuation', async() => {
  const usage = {input_tokens: 4, output_tokens: 2}, reports = [];
  const reasoning = {type: 'reasoning', encrypted_content: 'opaque'};
  const result = await consumeStream(streamResponse(response([
    {type: 'response.completed', response: {usage, output: [reasoning,
      {type: 'function_call', call_id: 'call', name: 'posts__publish', arguments: '{"id":1}'}]}}
  ]), 'responses'), {reportUsage: raw => reports.push(raw)});
  assert.deepEqual(result.toolCalls, [{id: 'call', name: 'posts.publish', input: {id: 1}}]);
  assert.deepEqual(result.providerData, {openai: [reasoning]});
  assert.deepEqual(reports.at(-1), usage);
});
test('Responses reports usage before incomplete failure and bounds frames', async() => {
  const reports = [], usage = {output_tokens: 2};
  await assert.rejects(consumeStream(streamResponse(response([
    {type: 'response.incomplete', response: {usage}}
  ]), 'responses'), {reportUsage: raw => reports.push(raw)}), /failed/);
  assert.deepEqual(reports.at(-1), usage);
  for (const suffix of ['', '\n\n']) {
    await assert.rejects(consumeStream(streamResponse(new Response('data: '+ 'x'.repeat(2000001) + suffix), 'responses')), /too large/);
  }
});
test('Chat Completions assembles bounded tool argument fragments', async() => {
  const fragment = (index, args, more = {}) => ({choices: [{delta: {tool_calls: [{index, ...more, function: {name: '', arguments: args, ...more.function}}]}}]});
  const result = await consumeStream(streamResponse(response([
    fragment(0, '{"id":', {id: 'call', function: {name: 'posts__publish'}}), fragment(0, '1}'),
    {choices: [{finish_reason: 'tool_calls'}]}, '[DONE]'
  ]), 'chat-completions'));
  assert.deepEqual(result.toolCalls, [{id: 'call', name: 'posts.publish', input: {id: 1}}]);
  await assert.rejects(consumeStream(streamResponse(response([fragment(0, 'x'.repeat(100001)), fragment(0, 'y'.repeat(100001))]), 'chat-completions')), /too large/);
  await assert.rejects(consumeStream(streamResponse(response([fragment(1e9, '{}')]), 'chat-completions')), /Invalid tool index/);
});
test('unknown protocols fail explicitly', () => {
  assert.throws(() => streamResponse(response([]), 'unknown'), /Unsupported/);
});
