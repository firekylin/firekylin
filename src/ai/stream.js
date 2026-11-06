'use strict';

const {records, append} = require('./stream-events');

async function chat(response, onText, reportUsage = () => {}, signal) {
  let text = '', usage, finishReason, toolSize = 0;
  const calls = [];
  for await (const raw of records(response.body, false, signal)) {
    if (raw === '[DONE]') {
      if (finishReason && !['stop', 'tool_calls'].includes(finishReason)) throw new Error('Provider stream incomplete');
      return {choices: [{message: {content: text, tool_calls: calls.filter(Boolean)}}], usage};
    }
    const event = JSON.parse(raw);
    if (event.usage) {usage = event.usage; reportUsage(usage, response)}
    if (event.error) throw new Error('Provider stream failed');
    const choice = event.choices?.find(item => item.index === 0 || item.index === undefined);
    if (choice?.finish_reason) finishReason = choice.finish_reason;
    text = append(text, choice?.delta?.content, onText);
    for (const call of choice?.delta?.tool_calls || []) {
      if (!Number.isInteger(call.index) || call.index < 0 || call.index >= 128) throw new Error('Invalid tool index');
      toolSize += (call.id?.length || 0) + (call.function?.name?.length || 0) + (call.function?.arguments?.length || 0);
      if (toolSize > 200000) throw new Error('Tool output too large');
      const target = calls[call.index] ||= {id: '', function: {name: '', arguments: ''}};
      if (call.id) target.id = call.id;
      if (call.function?.name) target.function.name += call.function.name;
      if (call.function?.arguments) target.function.arguments += call.function.arguments;
    }
  }
  throw new Error('Stream interrupted');
}

async function ollama(response, onText, reportUsage = () => {}, signal) {
  let text = '';
  for await (const raw of records(response.body, true, signal)) {
    const event = JSON.parse(raw);
    if (event.done || event.prompt_eval_count !== undefined || event.eval_count !== undefined) {
      reportUsage(event, response);
    }
    if (event.error) throw new Error('Ollama stream failed');
    text = append(text, event.message?.content, onText);
    if (event.done === true) {
      if (event.done_reason && event.done_reason !== 'stop') throw new Error('Ollama stream incomplete');
      return {...event, message: {...event.message, content: text}};
    }
  }
  throw new Error('Ollama stream interrupted');
}

async function responses(response, onText, reportUsage, signal) {
  let text = '';
  for await (const raw of records(response.body, false, signal)) {
    if (raw === '[DONE]') continue;
    const event = JSON.parse(raw);
    if (event.response?.usage) reportUsage(event.response.usage, response);
    if (event.type === 'response.output_text.delta') text = append(text, event.delta, onText);
    if (['error', 'response.failed', 'response.incomplete'].includes(event.type)) {
      throw new Error('OpenAI stream failed');
    }
    if (event.type === 'response.completed') {
      if (!event.response || ['incomplete', 'failed'].includes(event.response.status)) {
        throw new Error('OpenAI stream incomplete');
      }
      return event.response;
    }
  }
  throw new Error('OpenAI stream interrupted');
}

const parsers = {'chat-completions': chat, responses, ollama};

function streamResponse(response, protocol = 'chat-completions') {
  const custom = protocol && typeof protocol === 'object';
  if (custom) {
    if (!['sse', 'ndjson'].includes(protocol.format) || typeof protocol.parse !== 'function' ||
      (protocol.end !== undefined && typeof protocol.end !== 'function')) {
      throw new TypeError('Invalid custom AI stream parser');
    }
  } else if (!Object.hasOwn(parsers, protocol)) throw new TypeError('Unsupported AI stream protocol');
  if (!response?.ok || !response.body) throw new Error('Invalid AI stream response');
  return {stream: response, protocol: custom ? 'custom' : protocol, ...(custom ? {parser: protocol} : {})};
}
// Feature detection also distinguishes earlier cores that only accepted protocol names.
streamResponse.supportsCustomParser = true;

async function customStream(response, parser, {onText, reportUsage, signal}) {
  let text = '', usage, providerData, done = false, toolSize = 0;
  const toolCalls = [];
  const apply = event => {
    if (event === undefined || event === null) return;
    if (typeof event !== 'object' || Array.isArray(event) || typeof event.then === 'function') {
      throw new TypeError('Invalid custom AI stream event');
    }
    if (Object.hasOwn(event, 'usage')) {usage = event.usage; reportUsage(event.usage, response)}
    if (Object.hasOwn(event, 'resultUsage')) usage = event.resultUsage;
    if (event.error) throw new Error(String(event.error).slice(0, 500));
    if (event.text !== undefined && typeof event.text !== 'string') throw new TypeError('Invalid stream text');
    text = append(text, event.text, onText);
    if (event.toolCalls !== undefined) {
      if (!Array.isArray(event.toolCalls)) throw new TypeError('Invalid stream tool calls');
      toolSize += JSON.stringify(event.toolCalls).length;
      if (toolSize > 200000 || toolCalls.length + event.toolCalls.length > 128) {
        throw new Error('Tool output too large');
      }
      for (const call of event.toolCalls) {
        if (!call || typeof call.id !== 'string' || !call.id || typeof call.name !== 'string' || !call.name ||
          !call.input || typeof call.input !== 'object' || Array.isArray(call.input)) {
          throw new TypeError('Invalid stream tool call');
        }
        toolCalls.push(call);
      }
    }
    if (event.providerData !== undefined) {
      if (!event.providerData || typeof event.providerData !== 'object' || Array.isArray(event.providerData)) {
        throw new TypeError('Invalid stream provider data');
      }
      if (JSON.stringify(event.providerData).length > 200000) throw new Error('Provider data too large');
      providerData = event.providerData;
    }
    if (event.done === true) done = true;
    if (event.stop === true) {
      if (!done) throw new Error('Stream interrupted');
      return true;
    }
  };
  for await (const raw of records(response.body, parser.format === 'ndjson', signal)) {
    // Parsers are per-request, synchronous event adapters; core owns all I/O and limits.
    if (apply(parser.parse(raw))) break;
  }
  if (parser.end) apply(parser.end());
  if (!done) throw new Error('Stream interrupted');
  if (!toolCalls.length && !text.trim()) throw new Error('AI provider returned no text output');
  return {text, usage, ...(toolCalls.length ? {toolCalls} : {}), ...(providerData ? {providerData} : {})};
}

async function consumeStream(result, {onText = () => {}, reportUsage = () => {}, signal} = {}) {
  const {stream: response, protocol, provider, model} = result;
  streamResponse(response, protocol === 'custom' ? result.parser : protocol);
  reportUsage(undefined, response);
  if (protocol === 'custom') {
    return {...await customStream(response, result.parser, {onText, reportUsage, signal}), provider, model};
  }
  const payload = await parsers[protocol](response, onText, reportUsage, signal);
  let text, toolCalls = [], providerData, usage = payload.usage;
  if (protocol === 'responses') {
    text = typeof payload.output_text === 'string' ? payload.output_text : (payload.output || [])
      .flatMap(item => item.content || []).filter(item => item.type === 'output_text')
      .map(item => item.text)
      .join('\n');
    toolCalls = (payload.output || []).filter(item => item.type === 'function_call').map(item => ({
      id: item.call_id, name: item.name.replace(/__/g, '.'), input: JSON.parse(item.arguments)
    }));
    if (toolCalls.length) providerData = {openai: (payload.output || []).filter(item => item.type === 'reasoning')};
  } else if (protocol === 'chat-completions') {
    text = payload.choices[0].message.content;
    toolCalls = (payload.choices[0].message.tool_calls || []).map(call => ({
      id: call.id, name: call.function.name.replace(/__/g, '.'), input: JSON.parse(call.function.arguments)
    }));
  } else {
    text = payload.message.content;
    const input = payload.prompt_eval_count, output = payload.eval_count;
    usage = {prompt_tokens: input ?? null, completion_tokens: output ?? null,
      total_tokens: Number.isSafeInteger(input) && input >= 0 && Number.isSafeInteger(output) && output >= 0 &&
        Number.isSafeInteger(input + output) ? input + output : null};
  }
  if (!toolCalls.length && (typeof text !== 'string' || !text.trim())) {
    throw new Error('AI provider returned no text output');
  }
  return {text: text || '', provider, model, usage,
    ...(toolCalls.length ? {toolCalls} : {}), ...(providerData ? {providerData} : {})};
}

module.exports = {streamResponse, consumeStream};
