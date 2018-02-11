module.exports = class extends think.Logic {

  /**
   * set tag pathname with encoding name when user haven't set.
   */
  checkPathname() {
    if(this.post('pathname')) { return true; }

    let name = this.post('name');
    let pathname = encodeURIComponent(name);
    this.post('pathname', pathname);
  }

  postAction() {
    this.rules = {
      name: {
        required: true
      }
    };

    this.checkPathname();
  }

  putAction() {
    this.rules = {
      name: {
        required: true
      }
    };

    this.checkPathname();
  }
}
