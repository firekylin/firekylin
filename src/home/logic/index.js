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
  indexAction(){
   
  }
  /**
   * install
   * @return {[type]} [description]
   */
  installAction(){
    if(this.isGet()){
      return;
    }
    this.rules = {
      db_account: 'required',
      db_name: 'required',
      username: 'required|minLength:4',
      password: 'required|minLength:8'
    }
    this.validate(this.rules);
  }
}