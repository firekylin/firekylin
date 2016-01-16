'use strict';

import Base from './base.js';

export default class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  indexAction(){
    //auto render template file index_index.html
    return this.display();
  }
  /**
   * login
   * @return {} []
   */
  async loginAction(){
    if(this.isGet()){
      return this.display();
    }
    await this.session('userInfo', {name: 'firekylin'});
    return this.success();
  }
}