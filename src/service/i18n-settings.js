const {SUPPORTED_LOCALES} = require('./i18n');

const SETTINGS_KEY = 'locale';

function decode(value) {
  return SUPPORTED_LOCALES.includes(value) ? value : 'zh-CN';
}

function encode(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) throw new TypeError('Unsupported locale');
  return locale;
}

function publicSettings(locale) {
  return {locale};
}

module.exports = {SETTINGS_KEY, decode, encode, publicSettings};
