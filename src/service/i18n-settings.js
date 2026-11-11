const {SUPPORTED_LOCALES, createSnapshot} = require('./i18n');

const SETTINGS_KEY = 'locale';

function decode(value) {
  return createSnapshot(value);
}

function encode(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) throw new TypeError('Unsupported locale');
  return locale;
}

function publicSettings(snapshot) {
  return {locale: snapshot.locale};
}

module.exports = {SETTINGS_KEY, decode, encode, publicSettings};
