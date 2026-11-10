const Base = require('./base');

module.exports = class extends Base {
  updateAction() {
    this.allowMethods = 'post';
    return this.requireCsrf();
  }
};
