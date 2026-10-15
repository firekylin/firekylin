'use strict';

const permalink = require('../service/permalink');

const RESERVED_PATHS = new Set([
  '/', '/search', '/search.html', '/tags', '/tags.html', '/categories', '/categories.html',
  '/archives', '/rss', '/rss.xml', '/sitemap', '/sitemap.xml', '/opensearch.xml'
]);

module.exports = function permalinkMiddleware() {
  return async function resolvePermalink(ctx, next) {
    const normalizedPath = ctx.path.length > 1 ? ctx.path.replace(/\/$/, '') : ctx.path;
    if (!['GET', 'HEAD', 'POST'].includes(ctx.method) || RESERVED_PATHS.has(normalizedPath)) return next();
    if (/^\/(?:admin|api|static|theme|themes|uploads)(?:\/|$)/.test(ctx.path)) return next();
    let options;
    try { options = await think.model('options').getOptions() } catch { return next() }
    const candidates = permalink.match(ctx.path, options);
    if (!candidates.length) return next();

    const found = [];
    for (const candidate of candidates) {
      const where = {type: candidate.type, status: 3, is_public: 1};
      if (candidate.params.slug) where.pathname = candidate.params.slug;
      else where.id = Number(candidate.params.id) || 0;
      const content = await think.model('post').where(where)
        .field('id,type,pathname,create_time')
        .find();
      const expected = permalink.generate(candidate.type, content, options).replace(/\/$/, '');
      if (!think.isEmpty(content) && expected === normalizedPath) {
        found.push(content);
      }
    }
    if (!found.length) return next();
    const unique = new Map(found.map(content => [content.id, content]));
    if (unique.size > 1) return ctx.throw(409, 'Permalink matches more than one published content item');
    const content = [...unique.values()][0];
    ctx.state.originalPermalink = ctx.url;
    ctx.path = `/${Number(content.type) === 1 ? 'page' : 'post'}/${encodeURIComponent(content.pathname)}.html`;
    return next();
  };
};
