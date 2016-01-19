'use strict';
/**
 * model
 */
export default class extends think.model.base {

  /**
   * get password salt
   * @param  {String} username []
   * @param  {String} salt     []
   * @return {String}          []
   */
  getPasswordSalt(create_time, salt){
    return salt + think.md5(salt + create_time);
  }

  /**
   * get user info
   * @param  {String} username []
   * @return {Promise}          []
   */
  async getUserInfo(username, salt){
    let userInfo = this.where({name: username}).find();
    if(think.isEmpty(userInfo)){
      return userInfo;
    }
    let createTime = formatDateTime(userInfo.create_time);
    userInfo.create_time = createTime;
    //generate password salt
    if(salt){
      userInfo.salt = this.getPasswordSalt(userInfo.create_time, salt);
    }
    return userInfo;
  }
}