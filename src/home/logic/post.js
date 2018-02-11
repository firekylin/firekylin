module.exports = class extends think.Logic {
  /**
   * index action logic
   * @return {} []
   */
  indexAction() {

  }
  /**
   * detail action logic
   * @return {[type]} [description]
   */
  detailAction() {
    this.previewCheck();
  }
  /**
   * page action logic
   * @return {[type]} [description]
   */
  pageAction() {
    this.previewCheck();
  }

  previewCheck() {
    if(!this.isPost) {
      return true;
    }

    let rules = {
      preview: {
        method: 'GET',
        boolean: true
      },
      previewData: {
        requiredIf: ['preview', true]
      }
    };

    if(!this.validate(rules)) {
      this.ctx.throw(400);
    }
  }
}
