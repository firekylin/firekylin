const Base = require('./base');
const {getRestId} = require('../../../service/admin-rest');

module.exports = class extends Base {
  getId() {
    return getRestId(this.get('id'), this.ctx.path, 'user');
  }

  getAction() {
    const id = this.getId();
    const type = Number(this.userInfo.type);
    const isSelf = id && String(id) === String(this.userInfo.id);
    if (type !== firekylin.USER_ADMIN && ((id && !isSelf) || (type === firekylin.USER_COMMENTER && !id))) {
      return this.fail('USER_NO_PERMISSION');
    }
  }

  putAction() {
    const id = this.getId();
    if (!id) return this.fail('PARAMS_ERROR');
    const type = Number(this.userInfo.type);
    if (type !== firekylin.USER_ADMIN && this.get('type') === 'contributor') {
      return this.fail('USER_NO_PERMISSION');
    }
    if (type === firekylin.USER_COMMENTER && String(id) !== String(this.userInfo.id)) {
      return this.fail('USER_NO_PERMISSION');
    }
  }
};
