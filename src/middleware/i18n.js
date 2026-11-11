const {runWithSnapshot} = require('../service/i18n');
const {SETTINGS_KEY, decode} = require('../service/i18n-settings');
const {coreTranslator} = require('../service/i18n-resources');

module.exports = () => async(ctx, next) => {
  if (ctx.path === '/index/install') return next();
  const installed = global.firekylin?.isInstalled === true;
  let snapshot;
  try {
    snapshot = decode(await think.model('options').getCredentialValue(SETTINGS_KEY));
  } catch (error) {
    // Before installation is confirmed, let the existing controller check
    // unavailable options and redirect to the installer. Never hide outages
    // once the site is known to be installed.
    if (installed) throw error;
    snapshot = decode();
  }
  ctx.state = ctx.state || {};
  ctx.state.i18n = snapshot;
  ctx.state.t = coreTranslator(snapshot);
  return runWithSnapshot(snapshot, next);
};
