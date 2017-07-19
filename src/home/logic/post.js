'use strict';
/**
 * logic
 * @param  {} []
 * @return {}     []
 */
export default class extends think.logic.base {
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
    if(!this.isPost()) {
      return true;
    }

    let rules = {
      preview: 'boolean|get'
    };

    if(!this.validate(rules)) {
      think.statusAction(400, this.http);
    }
  }
}
