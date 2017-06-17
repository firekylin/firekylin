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
   * install
   * @return {[type]} [description]
   */
  installAction() {
    this.rules = {
      step: 'int|default:1'
    };

    if(!this.isGet()) {
      this.rules = think.extend({
        db_account: 'requiredIf:step,1',
        db_name: 'requiredIf:step,1',
        title: 'requiredIf:step,2',
        site_url: 'requiredIf:step,2:url',
        username: 'requiredIf:step,2|minLength:4',
        password: 'requiredIf:step,2|minLength:8'
      }, this.rules);
    }
  }
}
