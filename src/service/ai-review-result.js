'use strict';

function parseReviewResult(raw, original) {
  let result;
  try { result = JSON.parse(raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '')) } catch {
    throw new Error('AI 审阅结果格式不正确，请重新审阅');
  }
  if (!result || typeof result.text !== 'string' || !result.text.trim()) {
    throw new Error('AI 未返回有效的审阅正文');
  }
  const originalLines = original.split('\n').length, proposedLines = result.text.split('\n').length;
  const suggestions = (Array.isArray(result.suggestions) ? result.suggestions : []).filter(item => {
    if (!item || typeof item.reason !== 'string' || !item.reason.trim()) return false;
    const valid = (line, max) => line === null || Number.isSafeInteger(line) && line >= 1 && line <= max;
    return valid(item.originalLine, originalLines) && valid(item.proposedLine, proposedLines) &&
      (item.originalLine !== null || item.proposedLine !== null);
  }).map(item => ({originalLine: item.originalLine, proposedLine: item.proposedLine, reason: item.reason.trim()}));
  return {text: result.text, suggestions};
}
module.exports = {parseReviewResult};
