'use strict';
const {randomUUID} = require('node:crypto');
const context = require('./ai-audit-context');

const SETTINGS_KEY = 'ai_audit_settings';
const TOKEN_FIELDS = ['input_tokens', 'output_tokens', 'total_tokens',
  'cache_read_tokens', 'cache_write_tokens', 'reasoning_tokens'];
function number(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null }
function usage(result = {}) {
  const raw = result?.usage || {};
  const supplied = result?.usageDetails || {};
  const first = (...values) => values.find(value => number(value) !== null) ?? null;
  const field = (name, ...values) => Object.hasOwn(supplied, name) ? number(supplied[name]) : first(...values);
  const normalized = {
    input_tokens: field('inputTokens', raw.input_tokens, raw.prompt_tokens),
    output_tokens: field('outputTokens', raw.output_tokens, raw.completion_tokens),
    total_tokens: field('totalTokens', raw.total_tokens),
    cache_read_tokens: field('cacheReadTokens', raw.cache_read_input_tokens, raw.prompt_cache_hit_tokens,
      raw.input_tokens_details?.cached_tokens, raw.prompt_tokens_details?.cached_tokens),
    cache_write_tokens: field('cacheWriteTokens', raw.cache_creation_input_tokens),
    reasoning_tokens: field('reasoningTokens', raw.output_tokens_details?.reasoning_tokens,
      raw.completion_tokens_details?.reasoning_tokens)
  };
  if (normalized.total_tokens === null && normalized.input_tokens !== null && normalized.output_tokens !== null) {
    normalized.total_tokens = number(normalized.input_tokens + normalized.output_tokens);
  }
  return normalized;
}
function redact(text) {
  return text.replace(/^(\s*(?:authorization|cookie|set-cookie)\s*:)[^\r\n]*/gmi, '$1 [REDACTED]')
    .replace(/data:[^\s;,]+;base64,[A-Za-z0-9+/=]+/gi, '[BINARY OMITTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED]')
    .replace(/\b(?:sk|gsk|AIza|ghp|github_pat|xox[baprs])[-_A-Za-z0-9]{12,}/g, '[REDACTED]')
    .replace(/\bBearer\s+[^\s"'<>]+/gi, 'Bearer [REDACTED]')
    .replace(/((?:api[-_ ]?key|authorization|cookie|password|secret|access[-_ ]?token)\s*["']?\s*[:=]\s*)[^\r\n,;]+/gi, '$1[REDACTED]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@');
}
function textContent(value) {
  if (typeof value !== 'string' || !value) return {text: null, truncated: 0};
  const safe = redact(value);
  const characters = Array.from(safe);
  return {text: characters.slice(0, 10000).join(''), truncated: characters.length > 10000 ? 1 : 0};
}
function requestText(request) {
  return (Array.isArray(request?.messages) ? request.messages : []).map(message => {
    if (typeof message.content === 'string') return message.content;
    if (Array.isArray(message.content)) {
      return message.content.filter(part => part?.type === 'text' && typeof part.text === 'string')
        .map(part => part.text).join('\n');
    }
    return '';
  }).filter(Boolean).join('\n');
}
function safeLabel(value, limit = 128) {
  return typeof value === 'string' ? redact(value).slice(0, limit) : null;
}
class Audit {
  constructor({model, options, logger = console}) { this.model = model; this.options = options; this.logger = logger }
  async settings() {
    const values = await this.options().getOptions(true);
    try {
      return {recordContent: JSON.parse(values[SETTINGS_KEY] || '{}').recordContent === true};
    } catch { return {recordContent: false} }
  }
  async safe(stage, callback) {
    try { return await callback() } catch {
      // Never print database errors: they can contain SQL, credentials or recorded text.
      try { this.logger.error?.(`[ai-audit] ${stage} failed`) } catch { /* diagnostics must not break generation */ }
      return null;
    }
  }
  async start(request, call) {
    return this.safe('start', async() => {
      const settings = await this.settings();
      const input = settings.recordContent ? textContent(requestText(request)) : {text: null, truncated: 0};
      const identity = context.current();
      const row = {...identity, actor_name: safeLabel(identity.actor_name, 200), request_id: randomUUID(),
        plugin_id: safeLabel(call.pluginId), scenario: safeLabel(call.scenario || identity.scenario) || 'unspecified',
        started_at: Date.now(), status: 'unfinished', provider: null, model: null, capability: null,
        content_recorded: settings.recordContent ? 1 : 0, request_text: input.text, request_truncated: input.truncated};
      const id = await this.model().add(row);
      return {id, started: row.started_at, recorded: settings.recordContent};
    });
  }
  async resolve(entry, request) {
    if (!entry) return;
    return this.safe('resolve', () => this.model().where({id: entry.id}).update({
      provider: safeLabel(request.provider), model: safeLabel(request.model, 256),
      capability: safeLabel(request.capability || 'text', 64)
    }));
  }
  async finish(entry, {request, result, error, timeout, cancelled, failed = Boolean(error)}) {
    if (!entry) return;
    return this.safe('finish', async() => {
      const status = failed ? (timeout ? 'timeout' : cancelled ? 'cancelled' : 'failure') : 'success';
      const output = entry.recorded ? textContent(result?.text) : {text: null, truncated: 0};
      let category = null;
      if (failed) {
        if (timeout) category = 'timeout';
        else if (cancelled) category = 'cancelled';
        else if (error?.code === 'AI_UNSUPPORTED_CAPABILITY') category = 'unsupported_capability';
        else category = error instanceof TypeError ? 'invalid_request' : 'provider_error';
      }
      await this.model().where({id: entry.id}).update({
        provider: safeLabel(request?.provider), model: safeLabel(request?.model, 256),
        capability: safeLabel(request?.capability || 'text', 64), status, duration_ms: Date.now() - entry.started,
        ...usage(result || error), error_category: category, error_message: category ? `AI call ended: ${category}` : null,
        provider_request_id: safeLabel(result?.providerRequestId || error?.providerRequestId, 256),
        response_text: output.text, response_truncated: output.truncated});
    });
  }
}
module.exports = {Audit, SETTINGS_KEY, TOKEN_FIELDS, usage, redact, textContent, requestText};
