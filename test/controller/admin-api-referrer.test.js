const assert = require('node:assert/strict');
const test = require('node:test');

const {isLocalReferrer} = require('../../src/controller/admin/api/referrer');

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
