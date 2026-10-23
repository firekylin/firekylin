'use strict';
const {redact} = require('./ai-audit-privacy');

const sensitive = /^(?:.*(?:password|secret|credential|authorization|cookie|csrf|apikey|accesstoken|refreshtoken|idtoken|authtoken|jwt|signature)|token)$/i;
const excluded = /^(?:headers|rawheaders|files|attachments|images|imageurl|inlinedata)$/i;
function sanitizeContext(input) {
  let remaining = 100000, nodes = 0, truncated = false;
  const seen = new WeakSet();
  const clean = (value, depth = 0) => {
    if (++nodes > 5000 || remaining <= 0) {truncated = true; return '[TRUNCATED]'}
    if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'string') {
      const safe = redact(value), limit = Math.min(10000, Math.max(remaining, 0));
      const chars = Array.from(safe);
      remaining -= Math.min(chars.length, limit);
      if (chars.length > limit) {truncated = true; return chars.slice(0, limit).join('') + ' [TRUNCATED]'}
      return safe;
    }
    if (!value || typeof value !== 'object') return null;
    if (Buffer.isBuffer(value) || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return '[BINARY OMITTED]';
    if (/^(?:image|image_url|input_image)$/.test(value.type || '')) return '[IMAGE OMITTED]';
    if (depth > 10 || seen.has(value)) {truncated = true; return '[TRUNCATED]'}
    seen.add(value);
    let result;
    if (Array.isArray(value)) {
      if (value.length > 500) truncated = true;
      result = value.slice(0, 500).map(item => clean(item, depth + 1));
    } else {
      result = Object.create(null);
      const entries = Object.entries(value);
      if (entries.length > 500) truncated = true;
      for (const [key, item] of entries.slice(0, 500)) {
        if (nodes > 5000 || remaining <= 0) {truncated = true; break}
        if (key.length > 200) {truncated = true; continue}
        const normalized = key.replace(/[^a-z0-9]/gi, '');
        if (excluded.test(normalized)) continue;
        result[key] = sensitive.test(normalized) ? '[REDACTED]' : clean(item, depth + 1);
      }
    }
    seen.delete(value);
    return result;
  };
  const result = clean(input);
  return {...result, context_truncated: truncated};
}
function safeUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const absolute = /^https?:\/\//i.test(value);
    const url = new URL(value, 'https://audit.invalid');
    url.username = ''; url.password = '';
    for (const key of new Set(url.searchParams.keys())) {
      if (sensitive.test(key.replace(/[^a-z0-9]/gi, ''))) url.searchParams.set(key, '[REDACTED]');
    }
    return redact(absolute ? url.toString() : url.pathname + url.search);
  } catch {return '[INVALID URL]'}
}
module.exports = {sanitizeContext, safeUrl};
