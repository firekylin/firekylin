'use strict';
const Base = require('./base');
const auth = require('../../../service/admin-auth');
const query = require('../../../service/ai-audit-query');
const {Audit, SETTINGS_KEY} = require('../../../service/ai-audit');

module.exports = class extends Base {
  requireAdmin(write = false) {
    if ((this.userInfo?.type | 0) !== 1) return this.ctx.throw(403, 'Administrator permission required');
    if (write) {
      const token = this.ctx.get('X-CSRF-Token');
      if (!token || token !== auth.csrfToken(this.ctx)) return this.ctx.throw(403, 'CSRF validation failed');
    }
  }
  audit() { return new Audit({model: () => this.model('ai_audit_log'), options: () => this.model('options')}) }
  async getAction() {
    this.requireAdmin();
    const input = this.get();
    let data;
    if (input.id) {
      if (!/^[1-9]\d*$/.test(String(input.id))) return this.ctx.throw(400, 'Invalid log ID');
      data = await this.model('ai_audit_log').where({id: Number(input.id)}).find();
      if (!data.id) return this.ctx.throw(404, 'Log not found');
    } else {
      data = await query.list(() => this.model('ai_audit_log'), input);
      data.settings = await this.audit().settings();
    }
    return this.success(data);
  }
  putAction() {
    this.requireAdmin(true);
    return this.ctx.throw(405, 'Use the audited POST operations');
  }
  deleteAction() {
    this.requireAdmin(true);
    return this.ctx.throw(405, 'Use the audited POST operations');
  }
  async postAction() {
    this.requireAdmin(true);
    const input = this.post() || {};
    let data;
    if (input.action === 'settings') {
      if (typeof input.recordContent !== 'boolean') return this.ctx.throw(400, 'Invalid recording settings');
      await this.model('options').updateOptions(SETTINGS_KEY, JSON.stringify({recordContent: input.recordContent}));
      data = {recordContent: input.recordContent};
    } else if (input.action === 'cleanup') {
      const where = query.cleanup(input);
      data = {deleted: await this.model('ai_audit_log').where(where).delete()};
    } else return this.ctx.throw(400, 'Invalid audit action');
    return this.success(data);
  }
};
