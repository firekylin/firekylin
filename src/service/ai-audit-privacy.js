'use strict';
function redact(text) {
  return text.replace(/^(\s*(?:authorization|cookie|set-cookie)\s*:)[^\r\n]*/gmi, '$1 [REDACTED]')
    .replace(/data:[^\s;,]+;base64,[A-Za-z0-9+/=]+/gi, '[BINARY OMITTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED]')
    .replace(/\b(?:sk|gsk|AIza|ghp|github_pat|xox[baprs])[-_A-Za-z0-9]{12,}/g, '[REDACTED]')
    .replace(/\bBearer\s+[^\s"'<>]+/gi, 'Bearer [REDACTED]')
    .replace(/((?:api[-_ ]?key|authorization|cookie|password|secret|access[-_ ]?token)\s*["']?\s*[:=]\s*)[^\r\n,;]+/gi, '$1[REDACTED]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@');
}
function textContent(value) {
  if (typeof value !== 'string' || !value) return {text: null, truncated: 0};
  const safe = redact(value);
  const characters = Array.from(safe);
  return {text: characters.slice(0, 10000).join(''), truncated: characters.length > 10000 ? 1 : 0};
}
module.exports = {redact, textContent};
