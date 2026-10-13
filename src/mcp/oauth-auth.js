'use strict';

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) return true; // Non-browser MCP clients generally omit Origin.
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) return false;
  return allowedOrigins.includes(origin);
}


module.exports = {isAllowedOrigin};
