'use strict';
module.exports = {
  version: 1,
  optional: true,
  async migrate(context) {
    await require('../ai-audit-schema').migrate(context);
  }
};
