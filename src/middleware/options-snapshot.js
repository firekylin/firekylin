'use strict';

// Share raw option reads across models for one request, without retaining
// configuration between requests or querying options for static resources.
module.exports = () => (ctx, next) => think.model('options').withReadSnapshot(next);
