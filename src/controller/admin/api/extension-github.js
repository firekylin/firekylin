'use strict';

const Base = require('./base');
const adminAuth = require('../../../service/admin-auth');
const {ExtensionGitHub} = require('../../../service/extension-github');

module.exports = class extends Base {
  requireAdministrator() {
    if ((this.userInfo?.type | 0) !== 1) return this.ctx.throw(403, 'Administrator permission required');
  }

  async getAction() {
    this.requireAdministrator();
    return this.success(await new ExtensionGitHub(this.model('options')).status());
  }

  async postAction() {
    this.requireAdministrator();
    const csrf = this.ctx.get('X-CSRF-Token');
    if (!csrf || csrf !== adminAuth.csrfToken(this.ctx)) return this.ctx.throw(403, 'CSRF validation failed');
    const body = this.post() || {};
    const github = new ExtensionGitHub(this.model('options'));
    if (body.disconnect === true) {
      await github.disconnect();
      return this.success({connected: false});
    }
    if (typeof body.repository !== 'string' || (body.token !== undefined && typeof body.token !== 'string')) {
      return this.ctx.throw(400, 'Invalid GitHub connection');
    }
    let status;
    try { status = await github.save(body.repository, body.token) } catch (error) {
      if (['INVALID_GITHUB_REPOSITORY', 'INVALID_GITHUB_TOKEN'].includes(error.message)) {
        return this.ctx.throw(400, error.message);
      }
      return this.ctx.throw(502, 'GITHUB_CONNECTION_FAILED');
    }
    return this.success(status);
  }
};
