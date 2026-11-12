const {runWithLocale} = require('../service/i18n');
const {SETTINGS_KEY, decode} = require('../service/i18n-settings');
const {coreTranslator} = require('../service/i18n-resources');

module.exports = () => async(ctx, next) => {
  if (ctx.path === '/index/install') return next();
  const installed = global.firekylin?.isInstalled === true;
  let locale;
  try {
    locale = decode(await think.model('options').getCredentialValue(SETTINGS_KEY));
  } catch (error) {
    // Before installation is confirmed, let the existing controller check
    // unavailable options and redirect to the installer. Never hide outages
    // once the site is known to be installed.
    if (installed) throw error;
    locale = decode();
  }
  ctx.state = ctx.state || {};
  ctx.state.locale = locale;
  ctx.state.t = coreTranslator(locale);
  return runWithLocale(locale, next);
};
