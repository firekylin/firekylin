'use strict';

module.exports = {
  register(ctx) {
    const message = ctx.config.message === undefined ? 'Welcome to this site' : ctx.config.message;
    if (typeof message !== 'string' || !message.trim() || message.length > 200) {
      throw new TypeError('message must contain 1–200 characters and not be blank');
    }
    // This value is intentionally public. Never put credentials in message.
    ctx.routes.register({
      method: 'GET', path: '/message', auth: 'public',
      handler() { return {message} }
    });
    // Return text; let Eta's escaped output handle markup safely.
    ctx.templates.registerFunction('__PLUGIN_ID__.message', () => message);
  }
};
