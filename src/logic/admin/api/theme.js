module.exports = class extends require('./base') {
  async __before() {
    if (await super.__before() === false) return false;
    if (this.isGet) {
      return true;
    }

    if (this.config('DISALLOW_FILE_EDIT')) {
      return this.fail('FILE_EDIT_DISALLOWED!');
    }
  }
};
