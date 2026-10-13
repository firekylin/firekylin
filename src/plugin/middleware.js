'use strict';

const adminAuth = require('../service/admin-auth');

function adminResponse(data) {
  return {errno: 0, errmsg: '', data};
}

async function handleAdminExtension(manager, ctx) {
  const prefix = '/admin/api/plugins';
  if (ctx.path !== prefix && !ctx.path.startsWith(prefix + '/')) return false;
  if (!ctx.state.jwtSecret) {
    const options = await think.model('options').getOptions(true);
    ctx.state.jwtSecret = options.jwt_secret || options.comment_jwt_secret;
  }
  const user = adminAuth.currentUser(ctx) || {};
  if ((user.type | 0) !== 1) return ctx.throw(403, 'Administrator permission required');
  if (ctx.method === 'GET' && ctx.path === prefix) {
    ctx.body = adminResponse(manager.admin.manifest());
    return true;
  }
  const match = new RegExp(`^${prefix}/([^/]+)/(pages|forms|actions)/([^/]+)$`).exec(ctx.path);
  if (!match) return false;
  if (ctx.method === 'POST') {
    const token = ctx.get('X-CSRF-Token');
    if (!token || token !== adminAuth.csrfToken(ctx)) return ctx.throw(403, 'CSRF validation failed');
  }
  const [, pluginId, resource, resourceId] = match.map(value => value && decodeURIComponent(value));
  const context = {ctx, user, pluginId};
  let result;
  if (resource === 'pages' && ctx.method === 'GET') {
    result = await manager.admin.loadPage(pluginId, resourceId, context);
  }
  if (resource === 'forms' && ctx.method === 'GET') {
    result = await manager.admin.loadForm(pluginId, resourceId, context);
  }
  if (resource === 'forms' && ctx.method === 'POST') {
    result = await manager.admin.submitForm(pluginId, resourceId, ctx.request.body || {}, context);
  }
  if (resource === 'actions' && ctx.method === 'POST') {
    result = await manager.admin.runAction(pluginId, resourceId, ctx.request.body || {}, context);
  }
  if (typeof result === 'undefined') return false;
  if (result === null) return ctx.throw(404, 'Plugin admin resource not found');
  ctx.body = adminResponse(result);
  return true;
}

module.exports = function pluginRoutes() {
  return async function pluginRouteMiddleware(ctx, next) {
    const manager = global.firekylin && global.firekylin.plugins;
    if (manager && await handleAdminExtension(manager, ctx)) return;
    const route = manager && manager.routes.match(ctx.method, ctx.path);
    if (!route) return next();
    if ((route.auth === 'admin' || route.csrf) && !ctx.state.jwtSecret) {
      const options = await think.model('options').getOptions(true);
      ctx.state.jwtSecret = options.jwt_secret || options.comment_jwt_secret;
    }
    if (route.auth === 'admin') {
      const user = adminAuth.currentUser(ctx) || {};
      if ((user.type | 0) !== 1) return ctx.throw(403, 'Administrator permission required');
    }
    if (route.csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(ctx.method)) {
      const token = ctx.get('X-CSRF-Token');
      const sessionToken = adminAuth.csrfToken(ctx);
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
