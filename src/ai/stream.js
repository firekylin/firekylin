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

async function anthropic(response, onText, reportUsage = () => {}, signal) {
  let text = '', usage, stopReason;
  for await (const raw of records(response.body, false, signal)) {
    const event = JSON.parse(raw);

    if (event.type === 'message_start') usage = event.message?.usage;
    if (event.type === 'message_delta' && event.usage) usage = {...usage, ...event.usage};
    if (event.type === 'message_start' || event.usage) reportUsage(usage, response);
    if (event.error || event.type === 'error') throw new Error('Anthropic stream failed');
    if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
    if (event.type === 'content_block_start' && event.content_block?.type === 'text') {
      text = append(text, event.content_block.text, onText);
    }
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      text = append(text, event.delta.text, onText);
    }
    if (event.type === 'message_stop') {
      if (stopReason && !['end_turn', 'stop_sequence'].includes(stopReason)) {
        throw new Error('Anthropic stream incomplete');
      }
      return {content: [{type: 'text', text}], usage};
    }
  }
  throw new Error('Anthropic stream interrupted');
}

async function gemini(response, onText, reportUsage = () => {}, signal) {
  let text = '', usageMetadata, complete = false, finishReason;
  for await (const raw of records(response.body, false, signal)) {
    const event = JSON.parse(raw);
    if (event.usageMetadata) {usageMetadata = event.usageMetadata; reportUsage(usageMetadata, response)}
    if (event.error || event.promptFeedback?.blockReason) throw new Error('Gemini stream failed');
    const candidate = event.candidates?.find(item => item.index === 0 || item.index === undefined);
    for (const part of candidate?.content?.parts || []) {
      if (!part.thought) text = append(text, part.text, onText);
    }
    if (candidate?.finishReason && candidate.finishReason !== 'FINISH_REASON_UNSPECIFIED') {
      complete = true;
      finishReason = candidate.finishReason;
    }
  }
  if (!complete) throw new Error('Gemini stream interrupted');
  if (finishReason !== 'STOP') throw new Error('Gemini stream incomplete');
  return {candidates: [{content: {parts: [{text}]}}], usageMetadata};
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

const parsers = {'chat-completions': chat, responses, anthropic, gemini, ollama};

function streamResponse(response, protocol) {
  if (!Object.hasOwn(parsers, protocol)) throw new TypeError('Unsupported AI stream protocol');
  if (!response?.ok || !response.body) throw new Error('Invalid AI stream response');
  return {stream: response, protocol};
}

async function consumeStream(result, {onText = () => {}, reportUsage = () => {}, signal} = {}) {
  const {stream: response, protocol, provider, model} = result;
  streamResponse(response, protocol);
  reportUsage(undefined, response);
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
  } else if (protocol === 'anthropic') text = payload.content.map(item => item.text).join('');
  else if (protocol === 'gemini') {
    text = payload.candidates[0].content.parts.map(item => item.text).join('');
    const raw = payload.usageMetadata;
    usage = raw ? {prompt_tokens: raw.promptTokenCount ?? null, completion_tokens: raw.candidatesTokenCount ?? null,
      total_tokens: raw.totalTokenCount ?? null} : undefined;
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
