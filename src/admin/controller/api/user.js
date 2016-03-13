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
   * add user
   * @return {[type]} [description]
   */
  async postAction(){
    let data = this.post();
    let insertId = await this.modelInstance.addUser(data, this.ip());
    return this.success({id: insertId});
  }
  /**
   * update user info
   * @return {[type]} [description]
   */
  async putAction(){
    let type = this.get('type');
    //save password
    if(type === 'savepwd'){
      let userInfo = this.userInfo;
      let rows = await this.modelInstance.saveUser({
        password: this.post('password'),
        id: userInfo.id
      }, this.ip());
      return this.success(rows);
    }

    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }
    let data = this.post();
    data.id = this.id;
    let rows = await this.modelInstance.saveUser(data, this.ip());
    return this.success({affectedRows: rows});
  }
}
