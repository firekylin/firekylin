'use strict';

const {desktopAuth, RESOURCE} = require('./auth');
const {Operations, DesktopError} = require('./operations');
const {Content} = require('./content');
const {Collections, UPLOAD_LIMIT, EXTENSIONS} = require('./collections');

function json(ctx, body, status = 200) {
  ctx.status = status;
  ctx.type = 'application/json';
  ctx.set('Cache-Control', 'no-store');
  ctx.body = body;
}
async function readJSON(ctx) {
  if (String(ctx.get('content-type')).split(';')[0] !== 'application/json') {
    throw new DesktopError('JSON_REQUIRED', 415);
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of ctx.req) {
    length += chunk.length;
    if (length > 8 * 1024 * 1024) throw new DesktopError('REQUEST_TOO_LARGE', 413);
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new DesktopError('INVALID_JSON'); }
}

module.exports = function desktopMiddleware() {
  const auth = desktopAuth();
  const getModel = name => think.model(name);
  const operations = new Operations(getModel);
  return async function desktop(ctx, next) {
    if (ctx.path.startsWith('/desktop/oauth/') ||
      ctx.path === '/.well-known/oauth-protected-resource' + RESOURCE ||
      ctx.path === '/.well-known/oauth-authorization-server/desktop') return auth.oauth(ctx, next);
    if (ctx.path !== RESOURCE && !ctx.path.startsWith(RESOURCE + '/')) return next();
    try {
      const {options, origin} = await auth.configuration();
      if (!ctx.secure && !['http://localhost', 'http://127.0.0.1', 'http://[::1]'].some(value =>
        origin === value || origin.startsWith(value + ':'))) throw new DesktopError('HTTPS_REQUIRED', 403);
      if (ctx.path === RESOURCE + '/discovery' && ctx.method === 'GET') {
        return json(ctx, {apiVersion: 1, name: options.title || 'Firekylin', baseURL: origin,
          resource: origin + RESOURCE,
          authorizationMetadata: origin + '/.well-known/oauth-authorization-server/desktop',
          scopes: ['desktop:content'], upload: {maxBytes: UPLOAD_LIMIT, extensions: EXTENSIONS},
          supports: {revisions: true, idempotency: true, deploymentSubpaths: false}});
      }
      const principal = await auth.verify(ctx.get('authorization'));
      if (!principal) {
        ctx.set('WWW-Authenticate', 'Bearer resource_metadata="' + origin +
          '/.well-known/oauth-protected-resource' + RESOURCE + '"');
        throw new DesktopError('AUTHENTICATION_REQUIRED', 401);
      }
      const input = ['POST', 'PUT', 'DELETE'].includes(ctx.method) ? await readJSON(ctx) : {};
      const suffix = ctx.path.slice(RESOURCE.length + 1);
      const segments = suffix.split('/');
      const content = new Content({getModel, principal, siteOptions: options});
      const collections = new Collections({getModel, principal, siteOptions: options, ctx});
      let result;
      if (ctx.method === 'GET') {
        if (suffix === 'identity') {
          const admin = Number(principal.type) === global.firekylin.USER_ADMIN;
          const manager = admin || Number(principal.type) === global.firekylin.USER_EDITOR;
          result = {id: String(principal.id), name: principal.display_name || principal.name,
            avatar: principal.avatar || '', role: admin ? 'Administrator' : manager ? 'Editor' : 'Contributor',
            siteName: options.title || 'Firekylin', siteURL: origin,
            settingsURL: origin + (admin ? '/admin/options/general' : '/admin'),
            capabilities: {articles: true, pages: true, publish: admin, comments: manager, media: manager}};
        } else if (segments[0] === 'operations' && segments.length === 2) {
          result = await operations.lookup(Number(principal.id), segments[1]);
        } else if (['articles', 'pages'].includes(segments[0]) && segments.length <= 2) {
          result = segments[1]
            ? content.present(await content.get(segments[0], segments[1]))
            : await content.list(segments[0], ctx.query);
        } else if (suffix === 'comments') result = await collections.comments(ctx.query);
        else if (suffix === 'media') result = await collections.media(ctx.query);
        else if (suffix === 'taxonomy') {
          result = {
            categories: await getModel('cate').field('id,name').select(),
            tags: await getModel('tag').field('id,name').select()
          };
        } else throw new DesktopError('NOT_FOUND', 404);
      } else {
        const run = async() => {
          if (['articles', 'pages'].includes(segments[0]) && segments.length <= 2) {
            if (ctx.method === 'POST' && !segments[1]) return content.write(segments[0], null, input);
            if (ctx.method === 'PUT' && segments[1]) return content.write(segments[0], segments[1], input);
            if (ctx.method === 'DELETE' && segments[1]) return content.remove(segments[0], segments[1], input.revision);
          }
          if (segments[0] === 'comments' && segments.length === 2 && ctx.method === 'POST') {
            return collections.comment(segments[1], input);
          }
          if (suffix === 'media' && ctx.method === 'POST') return collections.upload(input);
          if (segments[0] === 'media' && segments.length === 2 && ctx.method === 'DELETE') {
            return collections.removeMedia(segments[1]);
          }
          throw new DesktopError('NOT_FOUND', 404);
        };
        result = await operations.run(Number(principal.id), ctx.get('Idempotency-Key'),
          {method: ctx.method, path: suffix, input}, run);
      }
      return json(ctx, result);
    } catch (error) {
      if (error instanceof DesktopError) return json(ctx, {error: error.code}, error.status);
      // Do not log document bodies, OAuth secrets, uploads, or database queries.
      return json(ctx, {error: 'SERVER_ERROR'}, 500);
    }
  };
};

module.exports.readJSON = readJSON;
