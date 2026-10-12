'use strict';

const crypto = require('node:crypto');

const random = () => crypto.randomBytes(32).toString('base64url');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const base64url = value => crypto.createHash('sha256').update(value).digest('base64url');
const validVerifier = value => typeof value === 'string' && /^[A-Za-z0-9._~-]{43,128}$/.test(value);
const validChallenge = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const validScope = value => typeof value === 'string' && value.length <= 512 &&
  (!value || value.split(' ').every(scope => /^[a-z][a-z0-9:._-]{0,63}$/.test(scope)));
const scopeList = value => [...new Set(String(value || '').split(' ').filter(Boolean))];

function redirectAllowed(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash || value.length > 1024) return false;
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  } catch (error) {
    return false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function safeClientName(value) {
  return typeof value === 'string' && value.length <= 100 && value.length > 0;
}

function publicOrigin(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
    throw new Error('OAuth requires a secure site_url');
  }
  if (parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('OAuth site_url must be a bare origin');
  return parsed.origin;
}

module.exports = {
  random, digest, base64url, validVerifier, validChallenge,
  validScope, scopeList, redirectAllowed, escapeHtml, safeClientName, publicOrigin
};
