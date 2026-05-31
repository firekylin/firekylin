module.exports = class extends think.Logic {
  /**
   * set tag pathname with encoding name when user haven't set.
   */
  checkPathname() {
    if (this.post('pathname')) { return true }

    const name = this.post('name');
    this.post('pathname', name);
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
};
