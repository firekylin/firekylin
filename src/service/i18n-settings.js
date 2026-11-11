const {randomUUID} = require('node:crypto');
const {SUPPORTED_LOCALES, createSnapshot} = require('./i18n');

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
// Revision is an opaque equality token, not a timestamp or sortable counter.
// Keeping it in the same row as locale makes each snapshot atomic across workers.
function encode(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) throw new TypeError('Unsupported locale');
  return JSON.stringify({locale, revision: randomUUID()});
}
function publicSettings(snapshot) {
  return {locale: snapshot.locale, localeRevision: snapshot.revision};
}
module.exports = {SETTINGS_KEY, decode, encode, publicSettings};
