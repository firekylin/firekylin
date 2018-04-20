module.exports = class extends think.Logic {
  __before() {
    if(this.isGet) {
      return true;
    }

    if(this.config('DISALLOW_FILE_EDIT')) {
      return this.fail('FILE_EDIT_DISALLOWED!');
    }
  }
}
