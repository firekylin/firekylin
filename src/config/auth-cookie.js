'use strict';

// Shared cookie settings for legacy sessions and stateless admin authentication.
// Keep the existing cookie name so upgrading does not leave duplicate login cookies.
module.exports = {
  name: 'thinkjs',
  httpOnly: true,
  path: '/'
};
