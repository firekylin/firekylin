const {runWithSnapshot} = require('../i18n');
const {SETTINGS_KEY, decode, publicSettings} = require('../i18n/settings');
const {coreTranslator} = require('../i18n/resources');

module.exports = () => async(ctx, next) => {
  if (ctx.path === '/index/install') return next();
  const snapshot = decode(await think.model('options').getCredentialValue(SETTINGS_KEY));
  ctx.state = ctx.state || {};
  ctx.state.i18n = snapshot;
  ctx.state.t = coreTranslator(snapshot);
  if (ctx.path === '/admin/locale' && ctx.method === 'GET') {
    ctx.set('Cache-Control', 'no-store');
    ctx.body = publicSettings(snapshot);
    return;
  }
  return runWithSnapshot(snapshot, next);
};
