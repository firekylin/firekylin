'use strict';
const FIELDS = ['inputTokens', 'outputTokens', 'totalTokens', 'cacheReadTokens', 'cacheWriteTokens', 'reasoningTokens'];
function token(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null }
function sumTokens(...values) {
  const counts = values.map(token);
  return counts.every(value => value !== null) ? token(counts.reduce((a, b) => a + b, 0)) : null;
}
function read(value, selector) {
  if (typeof selector === 'function') return selector(value);
  if (selector && typeof selector === 'object' && !Array.isArray(selector)) {
    if (Array.isArray(selector.sum)) return sumTokens(...selector.sum.map(part => read(value, part)));
    const selected = read(value, selector.field);
    return selected === undefined || selected === null ? selector.default : selected;
  }
  if (Array.isArray(selector)) {
    for (const path of selector) {
      const count = token(read(value, path));
      if (count !== null) return count;
    }
    return null;
  }
  return typeof selector === 'string' ? selector.split('.').reduce((item, key) => item?.[key], value) : null;
}
function createUsageAdapter(fields, {requestIdHeaders = ['x-request-id', 'request-id', 'cf-ray']} = {}) {
  // Snapshot the declaration; shared adapters cannot be mutated by another provider.
  const mapping = Object.fromEntries(FIELDS.map(key =>
    [key, Array.isArray(fields[key]) ? [...fields[key]] : fields[key]]));
  const headers = [...requestIdHeaders];
  function metadata(usage, response = {}) {
    const usageDetails = Object.fromEntries(FIELDS.map(key => [key, token(read(usage || {}, mapping[key]))]));
    if (usageDetails.totalTokens === null) {
      usageDetails.totalTokens = sumTokens(usageDetails.inputTokens, usageDetails.outputTokens);
    }
    const providerRequestId = headers.map(name => response.headers?.get?.(name)).find(Boolean);
    return {usageDetails, ...(providerRequestId ? {providerRequestId} : {})};
  }
  return Object.freeze({metadata});
}
// Protocol schemas, not vendor IDs. Vendors only override fields that differ from their protocol.
const CHAT_COMPLETION_FIELDS = Object.freeze({
  inputTokens: 'prompt_tokens', outputTokens: 'completion_tokens', totalTokens: 'total_tokens',
  cacheReadTokens: 'prompt_tokens_details.cached_tokens', reasoningTokens: 'completion_tokens_details.reasoning_tokens'
});
const RESPONSE_FIELDS = Object.freeze({
  inputTokens: 'input_tokens', outputTokens: 'output_tokens', totalTokens: 'total_tokens',
  cacheReadTokens: 'input_tokens_details.cached_tokens', reasoningTokens: 'output_tokens_details.reasoning_tokens'
});
const chatUsage = createUsageAdapter(CHAT_COMPLETION_FIELDS);
const responsesUsage = createUsageAdapter(RESPONSE_FIELDS);
module.exports = {createUsageAdapter, sumTokens, CHAT_COMPLETION_FIELDS, RESPONSE_FIELDS, chatUsage, responsesUsage};

function usageAdapter(declaration = {}) {
  const protocols = {'chat-completions': CHAT_COMPLETION_FIELDS, responses: RESPONSE_FIELDS};
  if (declaration.protocol && !Object.hasOwn(protocols, declaration.protocol)) {
    throw new TypeError('Unknown AI usage protocol');
  }
  // Snapshot serializable selectors so later plugin mutations cannot change an active registration.
  const fields = JSON.parse(JSON.stringify({...protocols[declaration.protocol], ...declaration.fields}));
  function validate(selector) {
    if (typeof selector === 'string' && selector.trim()) return;
    if (Array.isArray(selector) && selector.length) { selector.forEach(validate); return }
    if (selector && typeof selector === 'object') {
      if (Array.isArray(selector.sum) && selector.sum.length) { selector.sum.forEach(validate); return }
      if (typeof selector.field === 'string' && selector.field.trim() &&
          (selector.default === undefined || token(selector.default) !== null)) return;
    }
    throw new TypeError('Invalid AI usage selector');
  }
  Object.values(fields).forEach(validate);
  if (declaration.requestIdHeaders !== undefined && (!Array.isArray(declaration.requestIdHeaders) ||
      declaration.requestIdHeaders.some(name => typeof name !== 'string' || !name.trim()))) {
    throw new TypeError('Invalid AI usage request ID headers');
  }
  return createUsageAdapter(fields, declaration);
}
module.exports.usageAdapter = usageAdapter;
