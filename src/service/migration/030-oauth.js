'use strict';
module.exports = {
  version: 1,
  async migrate(context) {
    await require('../../mcp/oauth-schema').migrateOAuthModels(context);
  }
};
