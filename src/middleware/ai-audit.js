'use strict';
const context = require('../service/ai-audit-context');
const auth = require('../service/admin-auth');

module.exports = () => (ctx, next) => context.run({
  source: ctx.path?.startsWith('/admin/') ? 'admin' : 'http',
  request: () => ({url: ctx.href || ctx.url || ctx.path, method: ctx.method, query: ctx.query,
    parameters: ctx.request?.body?.post ?? ctx.request?.body}),
  user: () => {
    // The secret is installed by authenticated server middleware, never by payload data.
    try { return ctx.state?.jwtSecret ? auth.currentUser(ctx) : null } catch { return null }
  }
}, next);
