module.exports = class extends think.Logic {
  /**
   * set cate pathname with encoding name when user haven't set.
   */
  checkPathname() {
    if (this.post('pathname')) { return true }

    const name = this.post('name');
    const pathname = encodeURIComponent(name);
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
};
