'use strict';

const Base = require('./base');
const adminAuth = require('../../../service/admin-auth');

module.exports = class extends Base {
  ai() {
    const ai = global.firekylin && global.firekylin.plugins && global.firekylin.plugins.ai;
    if (!ai) return this.ctx.throw(404, 'AI service unavailable');
    return ai;
  }

  requireAdministrator() {
    if ((this.userInfo?.type | 0) !== 1) return this.ctx.throw(403, 'Administrator permission required');
  }

  async getAction() {
    this.requireAdministrator();
    return this.success({providers: await this.ai().models()});
  }

  async postAction() {
    this.requireAdministrator();
    const token = this.ctx.get('X-CSRF-Token');
    if (!token || token !== adminAuth.csrfToken(this.ctx)) return this.ctx.throw(403, 'CSRF validation failed');
    const body = this.post() || {};
    if (!Object.prototype.hasOwnProperty.call(body, 'provider')) return this.ctx.throw(400, 'Provider required');
    const ai = this.ai();
    if (body.provider === null || body.provider === '') {
      await ai.clear();
    } else {
      await ai.select(body.provider, body.model);
    }
    return this.success({message: 'AI 连接已保存'});
  }
};
