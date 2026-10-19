'use strict';

const {OAuthStore, TTL} = require('./oauth-store');
const adminAuth = require('../service/admin-auth');
const {
  base64url, digest, validVerifier, validChallenge, validScope,
  scopeList, redirectAllowed, escapeHtml, safeClientName
} = require('./oauth-utils');

const FORM_LIMIT = 32 * 1024;
const allowedScopes = new Set([
  'posts:read', 'posts:manage:read', 'posts:write', 'posts:publish', 'posts:delete',
  'taxonomy:read', 'taxonomy:write', 'comments:read', 'comments:write', 'comments:moderate',
  'settings:read', 'settings:write', 'media:write'
]);

function json(ctx, value, status = 200) {
  ctx.status = status;
  ctx.set('Cache-Control', 'no-store');
  ctx.type = 'application/json';
  ctx.body = value;
}

function oauthError(ctx, error, status = 400) {
  json(ctx, {error}, status);
}

function secure(ctx, origin) {
  const site = new URL(origin);
  return ctx.secure || (site.protocol === 'http:' && ctx.hostname === site.hostname);
}

function authorizable(scopes, user) {
  if (!user || ![1, 2].includes(Number(user.type))) return false;
  return scopes.every(scope => allowedScopes.has(scope) &&
    (Number(user.type) === 1 || ![
      'posts:publish', 'posts:delete', 'comments:read', 'comments:moderate',
      'taxonomy:write', 'comments:write', 'settings:read', 'settings:write'
    ].includes(scope)));
}

async function readForm(ctx) {
  const mime = String(ctx.get('content-type') || '').split(';')[0].trim();
  if (mime !== 'application/x-www-form-urlencoded') throw new Error('unsupported_media_type');
  let size = 0;
  const parts = [];
  for await (const chunk of ctx.req) {
    size += chunk.length;
    if (size > FORM_LIMIT) throw new Error('invalid_request');
    parts.push(chunk);
  }
  const params = new URLSearchParams(Buffer.concat(parts).toString('utf8'));
  const data = {};
  for (const [key, value] of params) {
    if (Object.prototype.hasOwnProperty.call(data, key)) throw new Error('invalid_request');
    data[key] = value;
  }
  return data;
}

function registrationAllowed(uris) {
  return Array.isArray(uris) && uris.length > 0 && uris.length <= 5 &&
    uris.every(uri => typeof uri === 'string' && redirectAllowed(uri)) &&
    new Set(uris).size === uris.length;
}

function buildOAuthHandler({origin, store, getUser, getCurrentUser = ctx => adminAuth.currentUser(ctx)}) {
  // Best-effort local abuse limit; deploy behind a shared/proxy rate limiter as well.
  const registrations = new Map();
  const resource = origin + '/mcp';
  const issuer = origin;
  const metadata = {
    issuer, authorization_endpoint: origin + '/oauth/authorize',
    token_endpoint: origin + '/oauth/token',
    registration_endpoint: origin + '/oauth/register',
    revocation_endpoint: origin + '/oauth/revoke',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    authorization_response_iss_parameter_supported: true,
    scopes_supported: [...allowedScopes],
    registration_endpoint_auth_methods_supported: ['none']
  };

  async function issueTokens(ctx, {userId, clientId, scopes}) {
    const access_token = await store.createGrant('access', {
      userId, clientId, scopes, resource
    });
    const refresh_token = await store.createGrant('refresh', {
      userId, clientId, scopes, resource
    });
    json(ctx, {
      access_token, refresh_token, token_type: 'Bearer',
      expires_in: TTL.access, scope: scopes.join(' ')
    });
  }

  return async function oauth(ctx, next) {
    const pathname = ctx.path;
    if (pathname === '/.well-known/oauth-protected-resource' ||
        pathname === '/.well-known/oauth-protected-resource/mcp') {
      if (ctx.method !== 'GET') return oauthError(ctx, 'invalid_request', 405);
      return json(ctx, {
        resource, authorization_servers: [issuer],
        bearer_methods_supported: ['header'],
        scopes_supported: [...allowedScopes]
      });
    }
    if (pathname === '/.well-known/oauth-authorization-server') {
      if (ctx.method !== 'GET') return oauthError(ctx, 'invalid_request', 405);
      return json(ctx, metadata);
    }

    if (!['/oauth/authorize', '/oauth/token', '/oauth/register', '/oauth/revoke'].includes(pathname)) {
      return next();
    }
    if (!secure(ctx, origin)) return oauthError(ctx, 'invalid_request', 403);
    ctx.set('Cache-Control', 'no-store');

    if (pathname === '/oauth/register') {
      if (ctx.method !== 'POST') return oauthError(ctx, 'invalid_request', 405);
      const ip = String(ctx.ip || 'unknown').slice(0, 128);
      const now = Date.now();
      if (registrations.size > 10000) registrations.clear();
      const previous = registrations.get(ip);
      const window = previous && previous.reset > now ? previous : {count: 0, reset: now + 3600000};
      if (window.count >= 20) return oauthError(ctx, 'rate_limited', 429);
      window.count++;
      registrations.set(ip, window);
      if (!String(ctx.get('content-type')).startsWith('application/json')) {
        return oauthError(ctx, 'invalid_request', 415);
      }
      const input = await readJson(ctx);
      if (!input || !safeClientName(input.client_name) || !registrationAllowed(input.redirect_uris) ||
          (input.token_endpoint_auth_method && input.token_endpoint_auth_method !== 'none')) {
        return oauthError(ctx, 'invalid_client_metadata');
      }
      const client = await store.registerClient({name: input.client_name, redirectUris: input.redirect_uris});
      return json(ctx, client, 201);
    }

    if (pathname === '/oauth/authorize') {
      if (!['GET', 'POST'].includes(ctx.method)) return oauthError(ctx, 'invalid_request', 405);
      let request;
      try { request = ctx.method === 'POST' ? await readForm(ctx) : ctx.query } catch {
        return oauthError(ctx, 'invalid_request');
      }
      const {
        client_id: clientId, redirect_uri: redirectUri, response_type: responseType,
        code_challenge: challenge, code_challenge_method: method,
        scope = 'posts:read', state, resource: targetResource
      } = request;
      const client = await store.client(clientId);
      if (!client || !client.redirectUris.includes(redirectUri)) {
        return oauthError(ctx, 'invalid_client');
      }
      if (responseType !== 'code' || !validChallenge(challenge) || method !== 'S256' ||
          !validScope(scope) || targetResource !== resource ||
          typeof state !== 'string' || !state || state.length > 1024) {
        return oauthError(ctx, 'invalid_request');
      }
      const scopes = scopeList(scope);
      const requestId = digest([clientId, redirectUri, challenge, scope, state, resource].join('\0'));
      const identity = await getCurrentUser(ctx);
      if (!identity || !identity.id) {
        const location = '/admin/login?redirect=' + encodeURIComponent(ctx.url);
        ctx.redirect(location);
        return;
      }
      const user = await getUser(Number(identity.id));
      if (!user || Number(user.status) !== 1 || !authorizable(scopes, user)) {
        return oauthError(ctx, 'access_denied', 403);
      }
      if (ctx.method === 'GET') {
        const redirect = new URL(redirectUri);
        const formAction = redirect.hostname === '[::1]' ? '' :
          ' form-action \'self\' ' + redirect.origin + ';';
        const csrf = await store.createGrant('consent', {
          userId: Number(user.id), clientId, scopes, resource, parent: requestId
        });
        const displayed = scopes.map(item => '<li>' + escapeHtml(item) + '</li>').join('');
        ctx.type = 'text/html; charset=utf-8';
        ctx.set('Content-Security-Policy',
          'default-src \'none\'; style-src \'unsafe-inline\';' + formAction + ' ' +
          'base-uri \'none\'; frame-ancestors \'none\''
        );
        ctx.set('X-Frame-Options', 'DENY');
        ctx.body = '<!doctype html><html lang="zh"><meta charset="utf-8"><title>授权 Firekylin</title>' +
          '<main style="font:16px system-ui;max-width:560px;margin:8vh auto;padding:24px">' +
          '<h1>授权 AI 客户端访问 Firekylin</h1><p>应用：' + escapeHtml(client.name) +
          '</p><p>登录用户：' + escapeHtml(user.name || String(user.id)) +
          '</p><p>回调地址：' + escapeHtml(redirectUri) +
          '</p><p>请求权限：</p><ul>' + displayed + '</ul>' +
          '<form method="post"><input type="hidden" name="client_id" value="' + escapeHtml(clientId) + '">' +
          '<input type="hidden" name="redirect_uri" value="' + escapeHtml(redirectUri) + '">' +
          '<input type="hidden" name="response_type" value="code">' +
          '<input type="hidden" name="code_challenge" value="' + escapeHtml(challenge) + '">' +
          '<input type="hidden" name="code_challenge_method" value="S256">' +
          '<input type="hidden" name="resource" value="' + escapeHtml(resource) + '">' +
          '<input type="hidden" name="scope" value="' + escapeHtml(scope) + '">' +
          '<input type="hidden" name="state" value="' + escapeHtml(state) + '">' +
          '<input type="hidden" name="csrf" value="' + csrf + '">' +
          '<button name="decision" value="allow">同意授权</button> ' +
          '<button name="decision" value="deny">拒绝</button></form></main></html>';
        return;
      }
      const consent = await store.consume('consent', request.csrf);
      if (!consent || consent.parent_hash !== requestId ||
          Number(consent.user_id) !== Number(user.id)) {
        return oauthError(ctx, 'invalid_request', 403);
      }
      const dest = new URL(redirectUri);
      dest.searchParams.set('state', state);
      dest.searchParams.set('iss', issuer);
      if (request.decision === 'deny') dest.searchParams.set('error', 'access_denied');
      else if (request.decision === 'allow') {
        const code = await store.createGrant('code', {
          userId: Number(user.id), clientId, scopes, resource, challenge, parent: digest(redirectUri)
        });
        dest.searchParams.set('code', code);
      } else return oauthError(ctx, 'invalid_request');
      ctx.redirect(dest.toString());
      return;
    }

    if (pathname === '/oauth/token') {
      if (ctx.method !== 'POST') return oauthError(ctx, 'invalid_request', 405);
      let data;
      try { data = await readForm(ctx) } catch { return oauthError(ctx, 'invalid_request') }
      const {grant_type: grant, client_id: clientId, resource: targetResource} = data;
      const client = await store.client(clientId);
      if (!client || targetResource !== resource) return oauthError(ctx, 'invalid_client');
      if (grant === 'authorization_code') {
        if (!client.redirectUris.includes(data.redirect_uri) || !validVerifier(data.code_verifier)) {
          return oauthError(ctx, 'invalid_grant');
        }
        const row = await store.lookup('code', data.code);
        if (!row || row.client_id !== clientId || row.resource !== resource ||
            row.challenge !== base64url(data.code_verifier) || row.parent_hash !== digest(data.redirect_uri)) {
          return oauthError(ctx, 'invalid_grant');
        }
        const used = await store.consume('code', data.code);
        if (!used) return oauthError(ctx, 'invalid_grant');
        const user = await getUser(Number(row.user_id));
        if (!user || Number(user.status) !== 1 || !authorizable(scopeList(row.scopes), user)) {
          return oauthError(ctx, 'invalid_grant');
        }
        return issueTokens(ctx, {userId: Number(row.user_id), clientId, scopes: scopeList(row.scopes)});
      }
      if (grant === 'refresh_token') {
        const row = await store.lookup('refresh', data.refresh_token);
        if (!row || row.client_id !== clientId || row.resource !== resource) return oauthError(ctx, 'invalid_grant');
        const consumed = await store.consume('refresh', data.refresh_token);
        if (!consumed) return oauthError(ctx, 'invalid_grant');
        const user = await getUser(Number(row.user_id));
        if (!user || Number(user.status) !== 1 ||
            !authorizable(scopeList(row.scopes), user)) return oauthError(ctx, 'invalid_grant');
        return issueTokens(ctx, {userId: Number(row.user_id), clientId, scopes: scopeList(row.scopes)});
      }
      return oauthError(ctx, 'unsupported_grant_type');
    }

    if (pathname === '/oauth/revoke') {
      if (ctx.method !== 'POST') return oauthError(ctx, 'invalid_request', 405);
      let data;
      try { data = await readForm(ctx) } catch { return oauthError(ctx, 'invalid_request') }
      // Token revocation requires possession of the secret; it does not grant access.
      if (typeof data.token !== 'string' || data.token.length > 256) return oauthError(ctx, 'invalid_request');
      await store.revoke(data.token);
      return json(ctx, {});
    }
  };
}

async function readJson(ctx) {
  let total = 0;
  const chunks = [];
  for await (const chunk of ctx.req) {
    total += chunk.length;
    if (total > FORM_LIMIT) return null;
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return null }
}

async function createOAuthHandler({origin, getModel, getUser, getCurrentUser}) {
  return buildOAuthHandler({origin, store: new OAuthStore(getModel), getUser, getCurrentUser});
}

module.exports = {createOAuthHandler, buildOAuthHandler, authorizable, registrationAllowed};
