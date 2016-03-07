'use strict';

import {PasswordHash} from 'phpass';
/**
 * model
 */
export default class extends think.model.base {

  /**
   * get password
   * @param  {String} username []
   * @param  {String} salt     []
   * @return {String}          []
   */
  getEncryptPassword(password){
    let passwordHash = new PasswordHash();
    let hash = passwordHash.hashPassword(password);
    return hash;
  }
  /**
   * check password
   * @param  {[type]} userInfo [description]
   * @param  {[type]} password [description]
   * @return {[type]}          [description]
   */
  checkPassword(userInfo, password){
    let passwordHash = new PasswordHash();
    return passwordHash.checkPassword(password, userInfo.password);
  }
  /**
   * after select
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  afterSelect(data){
    return data.map(item => {
      return this.afterFind(item);
    });
  }
  afterFind(data){
    if(data.create_time){
      data.create_time = think.datetime(new Date(data.create_time));
    }
    if(data.last_login_time){
      data.last_login_time = think.datetime(new Date(data.last_login_time));
    }
    return data;
  }
  /**
   * 添加用户
   * @param {[type]} data [description]
   * @param {[type]} ip   [description]
   */
  addUser(data, ip){
    let create_time = think.datetime();
    let encryptPassword = this.getEncryptPassword(data.password, ip, create_time); 
    return this.where({name: data.username, email: data.email, _logic: 'OR'}).thenAdd({
      name: data.username,
      email: data.email,
      display_name: data.display_name,
      password: encryptPassword,
      create_time: create_time,
      last_login_time: create_time,
      create_ip: ip,
      last_login_ip: ip,
      type: data.type,
      status: data.status
    });
  }
  /**
   * 保存用户信息
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  async saveUser(data, ip){
    let info = await this.where({id: data.id}).find();
    if(think.isEmpty(info)){
      return Promise.reject(new Error('UESR_NOT_EXIST'));
    }
    let password = data.password;
    if(password){
      password = this.getEncryptPassword(password);
    }
    let updateData = {};
    ['display_name', 'type', 'status'].forEach(item => {
      if(data[item]){
        updateData[item] = data[item];
      }
    });
    if(password){
      updateData.password = password;
    }
    if(think.isEmpty(updateData)){
      return Promise.reject('DATA_EMPTY');
    }
    updateData.last_login_time = think.datetime();
    updateData.last_login_ip = ip;
    return this.where({id: data.id}).update(updateData);
  }
}