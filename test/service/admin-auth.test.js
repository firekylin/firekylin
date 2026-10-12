'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
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
  auth.setSecret(SECRET);
  const token = auth.sign(USER);
  const decoded = auth.verify(token);
  assert.deepEqual(decoded, USER);
  assert.deepEqual(auth.verify(token), USER);
  const [header, payload] = token.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'HS256');
  assert.equal(JSON.parse(Buffer.from(payload, 'base64url')).aud, 'firekylin-admin');
  assert.equal(JSON.parse(Buffer.from(payload, 'base64url')).iss, 'firekylin');
});

test('rejects tampering, expired tokens, and cross-site signature mismatch', () => {
  process.env.FIREKYLIN_JWT_SECRET = SECRET;
  const token = auth.sign({id: 1, type: 1, name: 'admin'});
  const segments = token.split('.');
  const tampered = Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(segments[1], 'base64url')), type: 2})).toString('base64url');
  assert.equal(auth.verify([segments[0], tampered, segments[2]].join('.')), null);
  assert.equal(auth.verify(auth.sign(USER, -1)), null);
  assert.equal(auth.verify('invalid.jwt'), null);
  auth.setSecret(crypto.randomBytes(32).toString('hex'));
  assert.equal(auth.verify(token), null);
});

test('requires a persistent sufficiently strong secret', () => {
  assert.throws(() => auth.setSecret('short'), /jwt_secret/);
  auth.setSecret(SECRET);
});

test('issues HttpOnly cookies and clears them on logout', () => {
  process.env.FIREKYLIN_JWT_SECRET = SECRET;
  const ctx = context();
  auth.login(ctx, USER, true);
  assert.deepEqual(auth.currentUser(ctx), USER);
  const options = ctx.options.get(auth.COOKIE_NAME);
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.maxAge, 7 * 24 * 60 * 60 * 1000);
  assert.equal(typeof auth.csrfToken(ctx), 'string');
  auth.logout(ctx);
  assert.equal(auth.currentUser(ctx), null);
  assert.equal(auth.csrfToken(ctx), null);
  assert.equal(ctx.options.get(auth.COOKIE_NAME).maxAge, 0);
});
