'use strict';

import Base from './base.js';


export default class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction(){
    // let model = this.model('options');
    // let options = await model.getOptions();
    // console.log(options)
    //auto render template file index_index.html
    return this.display();
  }
}