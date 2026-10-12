'use strict';

const crypto = require('crypto');

const COOKIE_NAME = 'fk_admin_token';
const ISSUER = 'firekylin';
const AUDIENCE = 'firekylin-admin';
const DAY = 24 * 60 * 60;
const TTL = 7 * DAY;

function getSecret() {
  const secret = process.env.FIREKYLIN_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('FIREKYLIN_JWT_SECRET must contain at least 32 bytes');
  }
  return secret;
}

function base64(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signature(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function sign(user, seconds = TTL) {
  if (!user || !Number.isSafeInteger(Number(user.id)) || Number(user.id) <= 0 || ![1, 2].includes(Number(user.type))) throw new Error('Invalid administrator identity');
  const now = Math.floor(Date.now() / 1000);
  const header = base64({alg: 'HS256', typ: 'JWT'});
  const payload = base64({
    sub: String(user.id),
    name: String(user.name || ''),
    type: Number(user.type),
    iss: ISSUER,
    aud: AUDIENCE,
    iat: now,
    exp: now + seconds
  });
  const data = header + '.' + payload;
  return data + '.' + signature(data);
}

function verify(token) {
  if (typeof token !== 'string' || token.length > 8192) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const expected = signature(parts[0] + '.' + parts[1]);
    const a = Buffer.from(expected);
    const b = Buffer.from(parts[2]);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== ISSUER || claims.aud !== AUDIENCE ||
        !/^[1-9]\d*$/.test(String(claims.sub)) ||
        !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) ||
        claims.iat > now || claims.exp <= now || claims.exp - claims.iat > TTL ||
        ![1, 2].includes(claims.type)) return null;
    return {id: Number(claims.sub), name: claims.name, type: claims.type};
  } catch (e) {
    return null;
  }
}

function cookieOptions(ctx, remember) {
  return {
    httpOnly: true,
    secure: ctx.secure || ctx.protocol === 'https',
    sameSite: 'lax',
    path: '/',
    maxAge: remember ? 7 * DAY * 1000 : undefined
  };
}

function login(ctx, user, remember) {
  const token = sign(user);
  ctx.cookie(COOKIE_NAME, token, cookieOptions(ctx, remember));
}

function logout(ctx) {
  ctx.cookie(COOKIE_NAME, null, {...cookieOptions(ctx, false), maxAge: 0});
}

function currentUser(ctx) {
  return verify(ctx.cookie(COOKIE_NAME));
}

// A signed CSRF proof bound to the user's JWT. Used by plugin routes.
function csrfToken(ctx) {
  const token = ctx.cookie(COOKIE_NAME);
  if (!verify(token)) return null;
  return crypto.createHmac('sha256', getSecret()).update('plugin-csrf:' + token).digest('base64url');
}

module.exports = {COOKIE_NAME, sign, verify, login, logout, currentUser, csrfToken};
