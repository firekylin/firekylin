'use strict';

const core = require('./waline-core.cjs');

module.exports = {
  createCommentCore: core.createWalineCore,
  CommentError: core.WalineError
};
