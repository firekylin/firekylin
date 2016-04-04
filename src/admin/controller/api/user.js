'use strict';

import Base from './base.js';

export default class extends Base {
  /**
   * get
   * @return {[type]} [description]
   */
  getAction(self){
    let where = {};
    if( this.id ) {
      where.id = this.id;
    } else {
      if(this.get('type') === 'contributor') {
        where = {status: 2, type: 3};
      } else {
        where = {status: ['!=', 2], type: ['!=', 3], _logic: 'OR'};
      }
    }
    this.modelInstance.field('id,name,display_name,email,type,status,create_time,last_login_time,app_key,app_secret').where(where);
    return super.getAction(self);
  }
  /**
   * add user
   * @return {[type]} [description]
   */
  async postAction(self){
    if( this.get('type') === 'key' ) {
      return await this.generateKey(self);
    }

    let data = this.post();
    let insertId = await this.modelInstance.addUser(data, this.ip());
    return this.success({id: insertId});
  }

  async generateKey(self, status) {
    let isAdmin = this.userInfo.type === firekylin.USER_ADMIN;
    // let isMine = this.userInfo.id === this.id;
    if( !isAdmin ) {
      return this.failed();
    }

    let app_key = think.uuid();
    let app_secret = think.uuid();

    await this.modelInstance.generateKey(this.id, app_key, app_secret, status);
    //TODO: 增加邮件发送 app_key 和 app_secret 的功能

    this.id = null;
    return await this.getAction(self);
  }
  /**
   * update user info
   * @return {[type]} [description]
   */
  async putAction(self){
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

    if(type === 'contributor') {
      return await this.generateKey(self, 1);
    }
    let data = this.post();
    data.id = this.id;
    let rows = await this.modelInstance.saveUser(data, this.ip());
    return this.success({affectedRows: rows});
  }
}
