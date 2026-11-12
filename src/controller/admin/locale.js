const {publicSettings} = require('../../service/i18n-settings');

// Public boot metadata deliberately bypasses the authenticated admin base.
// It exposes no general site settings and cannot update the locale.
module.exports = class extends think.Controller {
  indexAction() {
    this.ctx.set('Cache-Control', 'no-store');
    if (this.ctx.method !== 'GET') {
      this.ctx.status = 405;
      this.ctx.set('Allow', 'GET');
      return;
    }
    this.ctx.body = publicSettings(this.ctx.state.locale);
  }
};
