const fs = require('fs');
const path = require('path');
const Base = require('./base');

const unlink = think.promisify(fs.unlink, fs);

function parseAttachment(row) {
  let options = row.options || {};
  if (typeof options === 'string') {
    try { options = JSON.parse(options) || {} } catch { options = {} }
  }
  return Object.assign({}, row, {
    attachment: options.attachment || {},
    url: `/attachment/${encodeURIComponent(row.pathname)}.html`
  });
}

module.exports = class extends Base {
  constructor(...args) {
    super(...args);
    this.modelInstance = this.model('post').setRelation(false).where({type: 2});
  }

  async getAction() {
    if (this.id) {
      const item = await this.modelInstance.where({id: this.id}).find();
      if (think.isEmpty(item)) return this.fail('ATTACHMENT_NOT_EXIST');
      return this.success(parseAttachment(item));
    }

    const where = {};
    if (this.get('images') === '1') where.options = ['like', '%image/%'];
    if (this.userInfo.type !== 1) where.user_id = this.userInfo.id;
    const keyword = String(this.get('keyword') || '').trim();
    if (keyword) where.title = ['like', `%${keyword}%`];
    const pageSize = Math.min(Math.max(Number(this.get('pageSize')) || 24, 1), 100);
    const result = await this.modelInstance.where(where)
      .field('id,user_id,title,pathname,create_time,update_time,options')
      .order('create_time DESC')
      .page(this.get('page'), pageSize)
      .countSelect();
    result.data = result.data.map(parseAttachment);
    return this.success(result);
  }

  async deleteAction() {
    if (!this.id) return this.fail('PARAMS_ERROR');
    const item = await this.modelInstance.where({id: this.id}).find();
    if (think.isEmpty(item)) return this.fail('ATTACHMENT_NOT_EXIST');
    if (this.userInfo.type !== 1 && item.user_id !== this.userInfo.id) {
      return this.fail('USER_NO_PERMISSION');
    }

    const attachment = parseAttachment(item).attachment;
    await this.removeLocalFile(attachment);
    const rows = await this.model('post').where({id: item.id, type: 2}).delete();
    return this.success({affectedRows: rows});
  }

  async removeLocalFile(attachment) {
    if (attachment.storage !== 'local' || !attachment.url) return;
    let relative = String(attachment.url).replace(/^https?:\/\/[^/]+/i, '');
    relative = relative
      .replace(/^\/?uploads\//, '')
      .replace(/^\/?(?:static\/)?upload\//, '');
    const root = path.resolve(think.UPLOAD_PATH);
    const target = path.resolve(root, relative);
    if (target === root || !target.startsWith(root + path.sep)) return;
    try { await unlink(target) } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
};
