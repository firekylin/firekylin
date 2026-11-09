'use strict';
const cache = require('../service/options-request-cache');

module.exports = () => (ctx, next) => cache.run(next);
