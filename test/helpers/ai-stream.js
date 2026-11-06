'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

module.exports = function streamTests(id) {
  const {consumeStream, streamResponse} = require('../../src/ai/stream');
  const protocol = {'google-gemini': 'gemini', anthropic: 'anthropic', ollama: 'ollama'}[id] || 'chat-completions';
  const generate = async options => {
    const response = await options.fetchImpl('test:streamGenerateContent?alt=sse', {
      signal: options.signal, body: JSON.stringify({stream: true, stream_options: {include_usage: true}})});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return consumeStream({...streamResponse(response, protocol), provider: id, model: options.request.model}, options);
  };
  const ndjson = id === 'ollama';
  const native = ['anthropic', 'google-gemini', 'ollama'].includes(id);
  const usage = {prompt_tokens: 3, completion_tokens: 2, total_tokens: 5};
  let events, expectedUsage = usage;
  if (id === 'anthropic') {
    expectedUsage = {input_tokens: 3, output_tokens: 2, cache_read_input_tokens: 1};
    events = [
      {type: 'message_start', message: {usage: {...expectedUsage, output_tokens: 0}}},
      {type: 'ping'},
      {type: 'content_block_start', content_block: {type: 'text', text: ''}},
      {type: 'content_block_delta', delta: {type: 'thinking_delta', thinking: 'hidden'}},
      {type: 'content_block_delta', delta: {type: 'text_delta', text: '你'}},
      {type: 'content_block_delta', delta: {type: 'text_delta', text: '好'}},
      {type: 'message_delta', usage: {output_tokens: 2}}, {type: 'message_stop'}
    ];
  } else if (id === 'google-gemini') {
    events = [
      {candidates: [{index: 0, content: {parts: [{text: 'hidden', thought: true}, {text: '你'}]}}]},
      {candidates: [{index: 0, content: {parts: [{text: '好'}]}, finishReason: 'STOP'}]},
      {usageMetadata: {promptTokenCount: 3, candidatesTokenCount: 2, totalTokenCount: 5}}
    ];
  } else if (ndjson) {
    events = [{message: {thinking: 'hidden', content: '你'}, done: false},
      {message: {content: '好'}, done: false},
      {message: {content: ''}, done: true, prompt_eval_count: 3, eval_count: 2}];
  } else {
    events = [{choices: [{index: 0, delta: {role: 'assistant', reasoning_content: 'hidden'}}]},
      {choices: [{index: 0, delta: {content: '你'}}]},
      {choices: [{index: 0, delta: {content: '好'}, finish_reason: 'stop'}]},
      {choices: [], usage}, '[DONE]'];
  }
  const wire = values => values.map(value => {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    return ndjson ? raw + '\n' : ': heartbeat\r\ndata: ' + raw + '\r\n\r\n';
  }).join('');
  const options = (overrides = {}) => ({apiKey: 'test', accountId: 'a'.repeat(32),
    request: {model: 'test-model', messages: [{role: 'user', content: 'hello'}]}, onText() {}, ...overrides});
  const response = (source, fragment = false) => ({ok: true,
    headers: new Headers({'content-type': ndjson ? 'application/x-ndjson' : 'text/event-stream'}),
    body: (async function*() {
      const bytes = new TextEncoder().encode(source);
      if (fragment) {for (const byte of bytes) yield Uint8Array.of(byte)}
      else yield bytes;
    })()});
  test(`${id}: incrementally decodes UTF-8 and split CRLF, returning full text and final usage`, async() => {
    const deltas = [], reports = [];
    const controller = new AbortController();
    let completed = false;
    const result = await generate(options({signal: controller.signal,
      onText: delta => {assert.equal(completed, false); deltas.push(delta)},
      reportUsage: raw => reports.push(raw),
      fetchImpl: async(url, init) => {
        assert.equal(init.signal, controller.signal);
        const body = JSON.parse(init.body);
        if (id === 'google-gemini') assert.match(url, /:streamGenerateContent\?alt=sse$/);
        else assert.equal(body.stream, true);
        if (!native) assert.deepEqual(body.stream_options, {include_usage: true});
        const result = response(wire(events), true), source = result.body;
        result.body = (async function*() {
          for await (const byte of source) yield byte;
          completed = true;
        })();
        return result;
      }}));
    assert.deepEqual(deltas, ['你', '好']);
    assert.equal(result.text, '你好');
    assert.deepEqual(result.usage, expectedUsage);
    assert.ok(reports.length >= 2);
    if (id === 'google-gemini') assert.equal(reports.at(-1).totalTokenCount, 5);
    else if (ndjson) assert.equal(reports.at(-1).eval_count, 2);
    else assert.deepEqual(reports.at(-1), expectedUsage);
  });
  test(`${id}: rejects truncated streams even after partial text or a chat finish_reason`, async() => {
    const partial = id === 'google-gemini' ? events.slice(0, 1) : events.slice(0, -1);
    await assert.rejects(generate(options({fetchImpl: async() => response(wire(partial))})), /interrupted/i);
  });
  test(`${id}: rejects provider error events without exposing their payload`, async() => {
    await assert.rejects(generate(options({fetchImpl: async() => response(wire([{error: {message: 'secret'}}]))})),
      error => /stream failed/.test(error.message) && !error.message.includes('secret'));
  });
  test(`${id}: rejects HTTP errors and malformed stream events`, async() => {
    await assert.rejects(generate(options({fetchImpl: async() => ({ok: false, status: 429})})), /HTTP 429/);
    await assert.rejects(generate(options({fetchImpl: async() => response(wire(['{invalid']))})), SyntaxError);
    await assert.rejects(generate(options({fetchImpl: async() => ({ok: true})})), /Invalid AI stream response/);
  });
  test(`${id}: preserves abort errors during stream consumption`, async() => {
    const controller = new AbortController(), abort = new DOMException('Aborted', 'AbortError');
    await assert.rejects(generate(options({signal: controller.signal, fetchImpl: async(_, init) => ({ok: true,
      body: (async function*() {
        yield new TextEncoder().encode(wire(events.slice(0, 1)));
        controller.abort(abort);
        init.signal.throwIfAborted();
      })()})})), error => error === abort);
  });
  test(`${id}: closes the reader if the callback throws`, async() => {
    let closed = false;
    const failure = new Error('callback failed');
    await assert.rejects(generate(options({onText() {throw failure}, fetchImpl: async() => ({ok: true,
      body: (async function*() {
        try {yield new TextEncoder().encode(wire(events))} finally {closed = true}
      })()})})), error => error === failure);
    assert.equal(closed, true);
  });
  test(`${id}: rejects empty output and excessive text`, async() => {
    const terminal = id === 'google-gemini' ? {candidates: [{finishReason: 'STOP'}]} : events.at(-1);
    await assert.rejects(generate(options({fetchImpl: async() => response(wire([terminal]))})), /no text output/);
    const large = wire(events).replace('你', 'x'.repeat(200001));
    await assert.rejects(generate(options({fetchImpl: async() => response(large)})), /too large/);
    await assert.rejects(generate(options({fetchImpl: async() => response('x'.repeat(2000001))})), /too large/);
  });
  test(`${id}: retains native usage when the stream errors or is incomplete`, async() => {
    const reports = [];
    let incomplete = structuredClone(events);
    if (id === 'anthropic') incomplete.at(-2).delta = {stop_reason: 'max_tokens'};
    else if (id === 'google-gemini') incomplete[1].candidates[0].finishReason = 'MAX_TOKENS';
    else if (ndjson) incomplete.at(-1).done_reason = 'length';
    else incomplete[2].choices[0].finish_reason = 'length';
    await assert.rejects(generate(options({reportUsage: raw => reports.push(raw),
      fetchImpl: async() => response(wire(incomplete))})), /incomplete/);
    assert.ok(reports.at(-1));
    const usageEvent = id === 'anthropic' ? events.at(-2) : ndjson ? events.at(-1) : events.at(-2);
    // Gemini's usage-only frame follows its finish frame.
    const first = id === 'google-gemini' ? events.at(-1) : usageEvent;
    await assert.rejects(generate(options({reportUsage: raw => reports.push(raw),
      fetchImpl: async() => response(wire([{...first, ...(ndjson ? {done: false} : {})},
        {error: {message: 'provider failed'}}]))})), /stream failed/);
    assert.ok(reports.at(-1));
  });
  if (ndjson) test('ollama: accepts final done object without newline', async() => {
    const result = await generate(options({fetchImpl: async() => response(wire(events).trimEnd())}));
    assert.equal(result.text, '你好');
  });
};
