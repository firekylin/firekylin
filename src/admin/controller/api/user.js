'use strict';

import Base from './base.js';

export default class extends Base {
  /**
   * get
   * @return {[type]} [description]
   */
  getAction(self){
    this.modelInstance.field('id,name,display_name,email,type,status,create_time,last_login_time');
    return super.getAction(self);
  }
  /**
   * add or update user
   * @return {} []
   */
  async putAction(){
    let data = this.post();
    let model = this.model('user');
    if(data.id){
      await model.saveUser(data, this.ip());
      return this.success();
    }else{
      let result = await model.addUser(data, this.ip());
      if(result.type === 'exist'){
        return this.fail('USER_EXIST');
      }
      return this.success();
    }
  }
}