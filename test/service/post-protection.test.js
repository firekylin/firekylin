'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.think = {Service: class {}};
const PostProtection = require('../../src/service/post-protection');

function context() {
  const cookies = new Map();
  return {
    method: 'GET',
    path: '/post/hello.html',
    protocol: 'https',
    secure: true,
    cookie(name, value) {
      if (arguments.length > 1) cookies.set(name, value);
      return cookies.get(name);
    }
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

test('unlock cookie is scoped to the post and invalidated by password changes', async() => {
  const protection = new PostProtection();
  const ctx = context();
  const post = {id: 42, options: {postPasswordHash: await protection.hash('secret')}};
  assert.equal(protection.isUnlocked(ctx, post), false);
  assert.deepEqual(await protection.unlock(ctx, post, 'wrong'), {unlocked: false, limited: false});
  assert.deepEqual(await protection.unlock(ctx, post, 'secret'), {unlocked: true, limited: false});
  assert.equal(protection.isUnlocked(ctx, post), true);

  post.options.postPasswordHash = await protection.hash('new secret');
  assert.equal(protection.isUnlocked(ctx, post), false);
});

test('password prompt escapes its action URL', () => {
  const protection = new PostProtection();
  const html = protection.form({...context(), path: '/post/"><script>alert(1)</script>'}, true);
  assert.match(html, /密码错误/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /name="protectPassword"/);
});

test('password attempts are rate limited per article and client', async() => {
  const protection = new PostProtection();
  const ctx = {...context(), ip: '203.0.113.10'};
  const post = {id: 77, options: {postPasswordHash: await protection.hash('secret')}};
  for (let count = 0; count < 5; count++) {
    assert.deepEqual(await protection.unlock(ctx, post, 'wrong'), {unlocked: false, limited: false});
  }
  assert.deepEqual(await protection.unlock(ctx, post, 'secret'), {unlocked: false, limited: true});
});
