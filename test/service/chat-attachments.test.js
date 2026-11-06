'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {normalizeAttachments, messageContent} = require('../../src/service/chat-attachments');
test('text files are normalized without trusting supplied metadata or URLs', () => {
  assert.deepEqual(normalizeAttachments([{name: '说明.md', content: '你好', size: 1, url: 'https://example.com'}]),
    [{name: '说明.md', content: '你好', size: 6}]);
  assert.deepEqual(normalizeAttachments(), []);
  assert.equal(messageContent({role: 'user', content: '普通聊天'}), '普通聊天');
  assert.match(messageContent({role: 'user', content: '', attachments: [{name: 'a.txt', content: '完整正文'}]}), /完整正文/);
});
test('rejects unsupported, malformed, empty, binary, oversized and excessive attachments', () => {
  for (const files of [null, {}, Array(6).fill({name: 'a.txt', content: 'a'}),
    ...['a.pdf', 'image.png', '../a.txt', 'a\\b.txt', 'a\n.txt'].map(name => [{name, content: 'a'}]),
    ...['', '\u0000text', '\ud800', '\ufffd', 'a'.repeat(32769)].map(content => [{name: 'a.txt', content}]),
    Array(3).fill({name: 'a.txt', content: 'a'.repeat(32768)})]) {
    assert.throws(() => normalizeAttachments(files));
  }
  assert.equal(normalizeAttachments(Array(2).fill({name: 'a.txt', content: 'a'.repeat(32768)})).length, 2);
});
