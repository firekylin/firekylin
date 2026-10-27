const assert = require('node:assert/strict');
const test = require('node:test');

const {isLocalReferrer, sameSiteHost} = require('../../src/controller/admin/api/referrer');

test('allows localhost referrers on any port', () => {
  assert.equal(isLocalReferrer('http://localhost:8360/admin/'), true);
  assert.equal(isLocalReferrer('https://localhost:3000/admin/'), true);
});

test('allows 127.0.0.1 referrers on any port', () => {
  assert.equal(isLocalReferrer('http://127.0.0.1:8360/admin/'), true);
  assert.equal(isLocalReferrer('https://127.0.0.1:3000/admin/'), true);
});

test('does not allow hostnames that only contain a local hostname', () => {
  assert.equal(isLocalReferrer('http://localhost.example.com/admin/'), false);
  assert.equal(isLocalReferrer('http://127.0.0.1.example.com/admin/'), false);
});

test('does not allow malformed referrers', () => {
  assert.equal(isLocalReferrer('localhost:8360/admin/'), false);
});

test('matches the exact site host, including the port', () => {
  assert.equal(sameSiteHost('example.com', 'example.com'), true);
  assert.equal(sameSiteHost('example.com:8360', 'example.com:8360'), true);
  assert.equal(sameSiteHost('example.com:8360', 'example.com'), true);
});

test('matches subdomains across the dot boundary in both directions', () => {
  assert.equal(sameSiteHost('www.example.com', 'example.com'), true);
  assert.equal(sameSiteHost('example.com', 'www.example.com'), true);
  assert.equal(sameSiteHost('admin.blog.example.com', 'example.com'), true);
});

test('rejects hosts that merely share a suffix without a dot boundary', () => {
  // 之前的后缀比较会让这些 host 通过校验。
  assert.equal(sameSiteHost('evil-example.com', 'example.com'), false);
  assert.equal(sameSiteHost('example.com.evil.com', 'example.com'), false);
  assert.equal(sameSiteHost('notexample.com', 'example.com'), false);
  assert.equal(sameSiteHost('evil-example.com', 'ample.com'), false);
});

test('rejects empty hosts', () => {
  assert.equal(sameSiteHost('', 'example.com'), false);
  assert.equal(sameSiteHost('example.com', ''), false);
  assert.equal(sameSiteHost(undefined, 'example.com'), false);
});
