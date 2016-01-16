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
  loginAction(){
    if(this.isGet()){
      return this.display();
    }
    
  }
}