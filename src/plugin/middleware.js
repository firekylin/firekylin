'use strict';

module.exports = function pluginRoutes() {
  return async function pluginRouteMiddleware(ctx, next) {
    const manager = global.firekylin && global.firekylin.plugins;
    const route = manager && manager.routes.match(ctx.method, ctx.path);
    if (!route) return next();
    if (route.auth === 'admin') {
      const user = await ctx.session('userInfo') || {};
      if ((user.type | 0) !== 1) return ctx.throw(403, 'Administrator permission required');
    }
    if (route.csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(ctx.method)) {
      const token = ctx.get('X-CSRF-Token');
      const sessionToken = await ctx.session('csrfToken');
      if (!token || token !== sessionToken) return ctx.throw(403, 'CSRF validation failed');
    }
    const match = route.regexp.exec(ctx.path);
    const params = {};
    route.names.forEach((name, index) => { params[name] = decodeURIComponent(match[index + 1]) });
    const result = await route.handler({ctx, params, query: ctx.query, body: ctx.request.body || ctx.body, plugin: route.pluginId});
    if (typeof result !== 'undefined') ctx.body = result;
  };
};
