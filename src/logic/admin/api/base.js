const auth = require('../../../service/admin-auth');

// Shared CSRF guard for cookie-authenticated APIs. Runs before controllers.
module.exports = class extends think.Logic {
  async __before() {
    if (['GET', 'HEAD', 'OPTIONS'].includes(this.ctx.method)) return;
    const options = await this.model('options').getOptions(true);
    this.ctx.state.jwtSecret = options.jwt_secret || options.comment_jwt_secret;
    const token = this.ctx.get('X-CSRF-Token');
    if (!token || token !== auth.csrfToken(this.ctx)) return this.ctx.throw(403, 'CSRF validation failed');
  }
};
