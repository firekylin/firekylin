'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseReviewResult} = require('../../src/ai/review-result');

test('review result preserves Markdown and validates suggestion line references', () => {
  const result = parseReviewResult(JSON.stringify({text: '# Title\nNew\n', suggestions: [
    {originalLine: 2, proposedLine: 2, reason: '改善表达'},
    {originalLine: null, proposedLine: 1, reason: '补充标题'},
    {originalLine: 99, proposedLine: 2, reason: '错误行号'},
    {originalLine: null, proposedLine: null, reason: '无定位'},
    {originalLine: 1, proposedLine: 1, reason: ''}
  ]}), '# Title\nOld\n');
  assert.equal(result.text, '# Title\nNew\n');
  assert.equal(result.suggestions.length, 2);
});
test('review result accepts fenced JSON but rejects malformed or empty content', () => {
  assert.deepEqual(parseReviewResult('```json\n{"text":"正文","suggestions":[]}\n```', '原文'),
    {text: '正文', suggestions: []});
  assert.throws(() => parseReviewResult('not json', '原文'), /格式不正确/);
  assert.throws(() => parseReviewResult('{"text":""}', '原文'), /未返回有效/);
});
