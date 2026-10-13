'use strict';

const crypto = require('node:crypto');

function createTokenVerifier(config, getUser) {
  const tokens = Array.isArray(config.tokens) ? config.tokens : [];
  const enabled = tokens.filter(item => item && /^[a-f0-9]{64}$/i.test(item.sha256 || '') &&
    Number.isSafeInteger(Number(item.userId)) && Number(item.userId) > 0 &&
    Array.isArray(item.scopes) && item.scopes.every(scope => typeof scope === 'string'));
  return async function verify(authorization) {
    const match = /^Bearer\s+([A-Za-z0-9._~+/-]{32,256})$/i.exec(authorization || '');
    if (!match) return null;
    const digest = crypto.createHash('sha256').update(match[1]).digest();
    let token;
    // Compare every configured digest to minimize timing information.
    for (const record of enabled) {
      const matches = crypto.timingSafeEqual(digest, Buffer.from(record.sha256, 'hex'));
      if (matches) token = record;
    }
    if (!token) return null;
    const user = await getUser(Number(token.userId));
    if (!user || !user.id || Number(user.status) !== 1) return null;
    return {
      principal: {id: Number(user.id), type: Number(user.type)},
      scopes: new Set(token.scopes),
      tokenId: crypto.createHash('sha256').update(token.sha256).digest('hex')
.slice(0, 12)
    };
  };
}

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) return true; // Non-browser MCP clients generally omit Origin.
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) return false;
  return allowedOrigins.includes(origin);
}

module.exports = {createTokenVerifier, isAllowedOrigin};
