'use strict';

export default class extends think.logic.base {
  loginAction(){
    if(!this.isPost()){
      return;
    }
  }
}