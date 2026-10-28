'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.think = {Service: class {}};
const PostProtection = require('../../src/service/post-protection');

function context() {
  return {
    method: 'GET',
    path: '/post/hello.html'
  };
}

test('post passwords are salted and verified without storing plaintext', async() => {
  const protection = new PostProtection();
  const first = await protection.hash('correct horse');
  const second = await protection.hash('correct horse');
  assert.notEqual(first, second);
  assert.equal(first.includes('correct horse'), false);
  assert.equal(await protection.verify('correct horse', first), true);
  assert.equal(await protection.verify('wrong', first), false);
  assert.equal(await protection.verify('correct horse', 'invalid'), false);
});

test('unlock validates only the current request without persisting access state', async() => {
  const protection = new PostProtection();
  const post = {id: 42, options: {postPasswordHash: await protection.hash('secret')}};
  assert.equal(await protection.unlock(post, 'wrong'), false);
  assert.equal(await protection.unlock(post, 'secret'), true);
});

test('comment access is scoped to the content and revoked on password change', async() => {
  const protection = new PostProtection();
  const post = {id: 42, options: {postPasswordHash: await protection.hash('secret')}};
  const values = new Map(); let attributes;
  const ctx = {secure: true, cookies: {
    set(name, value, options) { values.set(name, value); attributes = options },
    get(name) { return values.get(name) }
  }};
  protection.grantCommentAccess(ctx, post);
  assert.equal(attributes.httpOnly, true);
  assert.equal(attributes.secure, true);
  assert.equal(attributes.sameSite, 'lax');
  assert.equal(protection.hasCommentAccess(ctx, post), true);
  assert.equal(protection.hasCommentAccess(ctx, {...post, id: 43}), false);
  const changed = {id: 42, options: {postPasswordHash: await protection.hash('new secret')}};
  assert.equal(protection.hasCommentAccess(ctx, changed), false);
  values.set('fk_comment_access_42', 'forged');
  assert.equal(protection.hasCommentAccess(ctx, post), false);
});

test('password prompt escapes its action URL', () => {
  const protection = new PostProtection();
  const html = protection.form({...context(), path: '/post/"><script>alert(1)</script>'}, true);
  assert.match(html, /密码错误/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /name="protectPassword"/);
});

test('password prompt preserves a custom permalink after an internal rewrite', () => {
  const service = new PostProtection();
  const html = service.form({path: '/post/hello.html', state: {originalPermalink: '/hello.html?source=list'}});
  assert.match(html, /action="\/hello\.html\?source=list"/);
});
