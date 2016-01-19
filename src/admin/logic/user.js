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
   * salt action
   * @return {} []
   */
  saltAction(){
    this.allowMethods = 'post';
    this.rules = {
      username: {
        required: true,
        minLength: 4
      }
    }
  }
  /**
   * login
   * @return {} []
   */
  loginAction(){
    this.allowMethods = 'get,post';
    if(this.isGet()){
      return;
    }
    this.rules = {
      username: {
        required: true,
        minLength: 4
      },
      password: {
        required: true,
        length: [32, 32]
      },
      factor: {
        regexp: /^\d{6}$/
      }
    }
  }
}