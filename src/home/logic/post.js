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
    if(this.isPost()) {
      this.rules = {
        previewData: 'requiredIf:preview,true'
      };
    }
  }
  /**
   * page action logic
   * @return {[type]} [description]
   */
  pageAction() {
    if(this.isPost()) {
      this.rules = {
        previewData: 'requiredIf:preview,true'
      };
    }
  }
}
