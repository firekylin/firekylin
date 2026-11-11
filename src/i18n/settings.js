const {randomUUID} = require('node:crypto');
const {SUPPORTED_LOCALES, createSnapshot} = require('./index');
const {core} = require('./resources');

const SETTINGS_KEY = 'system_locale';

function decode(value) {
  if (!value) return createSnapshot();
  try {
    const data = JSON.parse(value);
    if (!SUPPORTED_LOCALES.includes(data.locale) || typeof data.revision !== 'string') throw new Error();
    return createSnapshot(data.locale, data.revision);
  } catch {
    return createSnapshot();
  }
}
function encode(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) throw new TypeError('Unsupported locale');
  return JSON.stringify({locale, revision: randomUUID()});
}
function publicSettings(snapshot) {
  return {locale: snapshot.locale, localeRevision: snapshot.revision,
    supportedLocales: SUPPORTED_LOCALES, localeResourceVersion: core.version};
}
module.exports = {SETTINGS_KEY, decode, encode, publicSettings};
