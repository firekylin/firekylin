const Base = require('./base');

module.exports = class extends Base {
  getAction() {
    const type = this.get('type');
    if (Number(this.userInfo.type) !== firekylin.USER_ADMIN &&
        (Number(this.userInfo.type) !== firekylin.USER_EDITOR || (type && type !== 'defaultCategory'))) {
      return this.fail('USER_NO_PERMISSION');
    }
  }
};
