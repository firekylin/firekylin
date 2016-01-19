'use strict';
/**
 * base controller
 */
export default class extends think.controller.base {
  /**
   * before magic method
   * @return {} []
   */
  async __before(){

    //get website options
    let model = this.model('options');
    let options = await model.getOptions();
    this.options = options;
    if(!this.isAjax()){
      this.assign('options', options);
    }
  }
}