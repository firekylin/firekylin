const {runWithSnapshot} = require('../service/i18n');
const {SETTINGS_KEY, decode} = require('../service/i18n-settings');
const {coreTranslator} = require('../service/i18n-resources');

module.exports = () => async(ctx, next) => {
  if (ctx.path === '/index/install') return next();
  const snapshot = decode(await think.model('options').getCredentialValue(SETTINGS_KEY));
  ctx.state = ctx.state || {};
  ctx.state.i18n = snapshot;
  ctx.state.t = coreTranslator(snapshot);
  return runWithSnapshot(snapshot, next);
};
