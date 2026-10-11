'use strict';
/* eslint-disable max-len */

const Base = require('./base');

module.exports = class extends Base {
  async getAction() {
    await this.service('comment-schema').ensure();
    const page = Math.max(Number(this.get('page')) || 1, 1);
    const pageSize = Math.min(Math.max(Number(this.get('pageSize')) || 20, 1), 100);
    const status = this.get('status');
    const where = status ? {status} : {};
    const model = this.model('comment');
    const [total, data] = await Promise.all([
      model.where(where).count(),
      model.where(where).order('inserted_at DESC').page(page, pageSize)
        .select()
    ]);
    return this.success({page, pageSize, total: Number(total), data});
  }

  async postAction() {
    const id = Number(this.post('id'));
    const action = this.post('operation');
    if (!id) return this.fail('PARAMS_ERROR');
    const model = this.model('comment');
    const comment = await model.where({id}).find();
    if (think.isEmpty(comment)) return this.fail('COMMENT_NOT_FOUND');
    if (action === 'delete') await model.where({id}).delete();
    else if (['approved', 'waiting', 'spam'].includes(action)) await model.where({id}).update({status: action, updated_at: think.datetime()});
    else if (action === 'edit') await model.where({id}).update({comment: String(this.post('comment') || ''), updated_at: think.datetime()});
    else return this.fail('INVALID_OPERATION');
    await this.service('comment').syncCount(this, comment.url);
    return this.success();
  }
};
