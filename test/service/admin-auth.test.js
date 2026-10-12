'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../../src/service/admin-auth');

const SECRET = 'firekylin-admin-test-secret-32bytes-long';
const USER = {id: 9, name: 'editor', type: 2};

function context() {
  const cookies = new Map();
  const options = new Map();
  return {
    protocol: 'https',
    secure: true,
    cookie(name, value, config) {
      if (arguments.length === 1) return cookies.get(name);
      if (value === null) cookies.delete(name);
      else cookies.set(name, value);
      options.set(name, config);
    },
    cookies,
    options
  };
}

test('administrator JWT round trip across stateless verifier calls', () => {
  const token = auth.sign(USER, SECRET);
  const decoded = auth.verify(token, SECRET);
  assert.deepEqual(decoded, USER);
  assert.deepEqual(auth.verify(token, SECRET), USER);
  const [header, payload] = token.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'HS256');
  assert.equal(JSON.parse(Buffer.from(payload, 'base64url')).aud, 'firekylin-admin');
  assert.equal(JSON.parse(Buffer.from(payload, 'base64url')).iss, 'firekylin');
});

test('commenter identities can hold a restricted backend session', () => {
  const commenter = {id: 12, name: 'commenter', type: 4};
  assert.deepEqual(auth.verify(auth.sign(commenter, SECRET), SECRET), commenter);
});

test('rejects tampering, expired tokens, and cross-site signature mismatch', () => {
  const token = auth.sign({id: 1, type: 1, name: 'admin'}, SECRET);
  const segments = token.split('.');
  const claims = {...JSON.parse(Buffer.from(segments[1], 'base64url')), type: 2};
  const tampered = Buffer.from(JSON.stringify(claims)).toString('base64url');
  assert.equal(auth.verify([segments[0], tampered, segments[2]].join('.'), SECRET), null);
  assert.equal(auth.verify(auth.sign(USER, SECRET, -1), SECRET), null);
  assert.equal(auth.verify('invalid.jwt', SECRET), null);
  assert.equal(auth.verify(token, 'a-different-secret-that-is-at-least-32-bytes'), null);
});

test('requires a persistent sufficiently strong secret', () => {
  assert.throws(() => auth.sign(USER, 'short'), /jwt_secret/);
});

test('issues HttpOnly cookies and clears them on logout', () => {
  const ctx = context();
  auth.login(ctx, USER, true, SECRET);
  assert.deepEqual(auth.currentUser(ctx, SECRET), USER);
  const options = ctx.options.get(auth.COOKIE_NAME);
  assert.equal(auth.COOKIE_NAME, 'thinkjs');
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.maxAge, 7 * 24 * 60 * 60 * 1000);
  assert.equal(typeof auth.csrfToken(ctx, SECRET), 'string');
  auth.login(ctx, USER, false, SECRET);
  assert.equal(ctx.options.get(auth.COOKIE_NAME).maxAge, 24 * 60 * 60 * 1000);
  auth.logout(ctx);
  assert.equal(auth.currentUser(ctx, SECRET), null);
  assert.equal(auth.csrfToken(ctx, SECRET), null);
  assert.equal(ctx.options.get(auth.COOKIE_NAME).maxAge, 0);
});
