const {AsyncLocalStorage} = require('node:async_hooks');

const context = new AsyncLocalStorage();
const SUPPORTED_LOCALES = Object.freeze(['zh-CN', 'en-US']);
const variable = /{{([A-Za-z_][A-Za-z0-9_]*)}}/g;
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);

function placeholders(text) {
  const names = [...text.matchAll(variable)].map(match => match[1]);
  if (names.some(name => forbidden.has(name)) || /{{|}}/.test(text.replace(variable, ''))) {
    throw new TypeError('Invalid translation placeholder');
  }
  return [...new Set(names)].sort();
}

function validateDictionary(dictionary) {
  if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) {
    throw new TypeError('Translation dictionary must be an object');
  }
  const result = Object.create(null);
  for (const [key, value] of Object.entries(dictionary)) {
    if (forbidden.has(key) || typeof value !== 'string' ||
        JSON.stringify(placeholders(key)) !== JSON.stringify(placeholders(value))) {
      throw new TypeError('Invalid translation entry');
    }
    result[key] = value;
  }
  return Object.freeze(result);
}

function createSnapshot(locale = 'zh-CN', revision = '') {
  return Object.freeze({locale: SUPPORTED_LOCALES.includes(locale) ? locale : 'zh-CN', revision: String(revision)});
}

function createTranslator({namespace, snapshot, resources = {}, defaultLocale = 'zh-CN'}) {
  if (!/^(core|admin|(?:theme|plugin):[A-Za-z0-9_.-]+)$/.test(namespace)) throw new TypeError('Invalid namespace');
  const dictionaries = Object.create(null);
  for (const [locale, dictionary] of Object.entries(resources)) {
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) throw new TypeError('Invalid locale');
    dictionaries[locale] = validateDictionary(dictionary);
  }
  const candidates = [...new Set([snapshot.locale, snapshot.locale.split('-')[0], defaultLocale])];
  return (key, vars = {}) => {
    if (typeof key !== 'string') throw new TypeError('Translation key must be a string');
    placeholders(key);
    let text = key;
    for (const locale of candidates) {
      if (dictionaries[locale] && Object.hasOwn(dictionaries[locale], key)) {
        text = dictionaries[locale][key];
        break;
      }
    }
    return text.replace(variable, (_, name) => {
      if (!Object.hasOwn(vars, name)) {
        if (process.env.NODE_ENV !== 'production') throw new TypeError('Missing translation variable');
        return '';
      }
      const value = vars[name];
      if (value === null || value === undefined) return '';
      if (!['string', 'number', 'boolean'].includes(typeof value)) throw new TypeError('Invalid variable value');
      return String(value);
    });
  };
}

function runWithSnapshot(snapshot, callback) {
  return context.run(createSnapshot(snapshot.locale, snapshot.revision), callback);
}

module.exports = {SUPPORTED_LOCALES, createSnapshot, createTranslator, validateDictionary, runWithSnapshot,
  currentSnapshot: () => context.getStore()};
