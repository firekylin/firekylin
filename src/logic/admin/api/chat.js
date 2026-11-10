const Base = require('./base');

module.exports = class extends Base {
  async __before() {
    if (await super.__before() === false) return false;
    return this.requireCsrf();
  }
};
