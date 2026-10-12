'use strict';

const adminAuth = require('../service/admin-auth');

module.exports = function pluginRoutes() {
  return async function pluginRouteMiddleware(ctx, next) {
    const manager = global.firekylin && global.firekylin.plugins;
    const route = manager && manager.routes.match(ctx.method, ctx.path);
    if (!route) return next();
    let secret;
    if (route.auth === 'admin' || route.csrf) {
      const options = await think.model('options').getOptions(true);
      secret = options.jwt_secret || options.comment_jwt_secret;
    }
    if (route.auth === 'admin') {
      const user = adminAuth.currentUser(ctx, secret) || {};
      if ((user.type | 0) !== 1) return ctx.throw(403, 'Administrator permission required');
    }
    if (route.csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(ctx.method)) {
      const token = ctx.get('X-CSRF-Token');
      const sessionToken = adminAuth.csrfToken(ctx, secret);
      if (!token || token !== sessionToken) return ctx.throw(403, 'CSRF validation failed');
    }
    const match = route.regexp.exec(ctx.path);
    const params = {};
    route.names.forEach((name, index) => { params[name] = decodeURIComponent(match[index + 1]) });
    const result = await route.handler({
      ctx, params, query: ctx.query, body: ctx.request.body || ctx.body, plugin: route.pluginId
    });
    if (typeof result !== 'undefined') ctx.body = result;
  };
};
