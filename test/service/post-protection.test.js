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

test('password prompt escapes its action URL', () => {
  const protection = new PostProtection();
  const html = protection.form({...context(), path: '/post/"><script>alert(1)</script>'}, true);
  assert.match(html, /密码错误/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /name="protectPassword"/);
});
