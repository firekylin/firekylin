const Base = require('./base');

module.exports = class extends Base {
  /**
   * sync comment num
   * @return {[type]} [description]
   */
  async sync_commentAction() {
    await this.service('comment').sync();
    this.success();
  }
};
