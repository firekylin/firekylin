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

test('post passwords are salted and verified without storing plaintext', () => {
  const protection = new PostProtection();
  const first = protection.hash('correct horse');
  const second = protection.hash('correct horse');
  assert.notEqual(first, second);
  assert.equal(first.includes('correct horse'), false);
  assert.equal(protection.verify('correct horse', first), true);
  assert.equal(protection.verify('wrong', first), false);
  assert.equal(protection.verify('correct horse', 'invalid'), false);
});

test('unlock cookie is scoped to the post and invalidated by password changes', () => {
  const protection = new PostProtection();
  const ctx = context();
  const post = {id: 42, options: {postPasswordHash: protection.hash('secret')}};
  assert.equal(protection.isUnlocked(ctx, post), false);
  assert.equal(protection.unlock(ctx, post, 'wrong'), false);
  assert.equal(protection.unlock(ctx, post, 'secret'), true);
  assert.equal(protection.isUnlocked(ctx, post), true);

  post.options.postPasswordHash = protection.hash('new secret');
  assert.equal(protection.isUnlocked(ctx, post), false);
});

test('password prompt escapes its action URL', () => {
  const protection = new PostProtection();
  const html = protection.form({...context(), path: '/post/"><script>alert(1)</script>'}, true);
  assert.match(html, /密码错误/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /name="protectPassword"/);
});
