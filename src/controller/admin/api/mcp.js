'use strict';

const Base = require('./base');
const McpAuthorizationService = require('../../../service/mcp-authorizations');

module.exports = class extends Base {
  getService() {
    return new McpAuthorizationService(name => this.model(name));
  }

  async getAction() {
    const items = await this.getService().list(Number(this.userInfo.id));
    return this.success(items);
  }

  async deleteAction() {
    const clientId = String(this.id || '');
    if (!clientId) return this.fail('PARAMS_ERROR');
    try {
      const result = await this.getService().revoke(Number(this.userInfo.id), clientId);
      return this.success(result);
    } catch (error) {
      if (error instanceof TypeError) return this.fail('PARAMS_ERROR');
      throw error;
    }
  }
};
