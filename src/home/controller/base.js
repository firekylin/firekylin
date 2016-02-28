'use strict';

export default class extends think.controller.base {
  /**
   * some base method in here
   */
  async __before(){
    let model = this.model('options');
    let options = await model.getOptions();
    this.options = options;
    this.assign('options', options);
  }
}