'use strict';

const DEFAULT_PATTERNS = {
  post: '/post/{slug}.html',
  page: '/page/{slug}.html'
};
const TOKENS = new Set(['slug', 'id', 'year', 'month', 'day']);

function pattern(options, type) {
  const key = type === 'page' || type === 1 ? 'page_permalink' : 'post_permalink';
  return String(options && options[key] || DEFAULT_PATTERNS[key.replace('_permalink', '')]);
}

function validate(value) {
  const input = String(value || '').trim();
  if (!input.startsWith('/') || input.includes('?') || input.includes('#') || input.includes('\\')) {
    throw new TypeError('Permalink pattern must be an absolute path without query strings or fragments');
  }
  if (/^\/(?:admin|api|static|theme|themes|uploads)(?:\/|$)/i.test(input)) {
    throw new TypeError('Permalink pattern uses a reserved system path');
  }
  const tokens = [...input.matchAll(/\{([a-z]+)\}/g)].map(item => item[1]);
  if (!tokens.includes('slug') && !tokens.includes('id')) {
    throw new TypeError('Permalink pattern must contain {slug} or {id}');
  }
  if (tokens.some(token => !TOKENS.has(token))) throw new TypeError('Permalink pattern contains an unsupported token');
  if (input.replace(/\{(?:slug|id|year|month|day)\}/g, '').match(/[{}]/)) {
    throw new TypeError('Permalink pattern contains malformed tokens');
  }
  if (new Set(tokens).size !== tokens.length) throw new TypeError('Permalink pattern contains duplicate tokens');
  return input.replace(/\/{2,}/g, '/');
}

function dateParts(value) {
  const date = value instanceof Date ? value : new Date(String(value || '').replace(' ', 'T'));
  const valid = !Number.isNaN(date.getTime()) ? date : new Date(0);
  return {
    year: String(valid.getFullYear()).padStart(4, '0'),
    month: String(valid.getMonth() + 1).padStart(2, '0'),
    day: String(valid.getDate()).padStart(2, '0')
  };
}

function encodeValue(value) {
  const text = String(value === null || typeof value === 'undefined' ? '' : value);
  try { return encodeURIComponent(decodeURIComponent(text)) } catch { return encodeURIComponent(text) }
}

function generate(type, content, options = {}) {
  const values = {
    slug: encodeValue(content.pathname || content.slug || ''),
    id: encodeValue(content.id || ''),
    ...dateParts(content.create_time)
  };
  let selected;
  try {
    selected = validate(pattern(options, type));
  } catch {
    selected = DEFAULT_PATTERNS[type === 'page' || type === 1 ? 'page' : 'post'];
  }
  return selected.replace(/\{([a-z]+)\}/g, (match, token) => values[token]);
}

function compile(type, options = {}) {
  let route;
  try {
    route = validate(pattern(options, type));
  } catch {
    route = DEFAULT_PATTERNS[type === 'page' || type === 1 ? 'page' : 'post'];
  }
  const names = [];
  let cursor = 0;
  let source = '';
  for (const match of route.matchAll(/\{([a-z]+)\}/g)) {
    source += route.slice(cursor, match.index).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    names.push(match[1]);
    source += match[1] === 'year' ? '(\\d{4})' : ['month', 'day'].includes(match[1]) ? '(\\d{2})' : '([^/]+)';
    cursor = match.index + match[0].length;
  }
  source += route.slice(cursor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {type: type === 'page' || type === 1 ? 1 : 0, regexp: new RegExp(`^${source}/?$`), names};
}

function match(pathname, options = {}) {
  const matches = [];
  for (const type of ['post', 'page']) {
    const route = compile(type, options);
    const found = route.regexp.exec(pathname);
    if (!found) continue;
    const params = {};
    try {
      route.names.forEach((name, index) => { params[name] = decodeURIComponent(found[index + 1]) });
    } catch {
      continue;
    }
    matches.push({type: route.type, params});
  }
  return matches;
}

module.exports = {DEFAULT_PATTERNS, validate, generate, compile, match};
