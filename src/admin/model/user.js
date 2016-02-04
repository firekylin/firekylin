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
  getEncryptPassword(password, ip, create_time){
    return think.md5(`${password}$${ip}$${create_time}`);
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
      password = this.getEncryptPassword(password, info.create_ip, think.datetime(new Date(info.create_time)));
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
    updateData.last_login_time = think.datetime();
    updateData.last_login_ip = ip;
    return this.where({id: data.id}).update(updateData);
  }
}