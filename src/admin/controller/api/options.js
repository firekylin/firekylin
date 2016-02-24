'use strict';

import Base from './base.js';
import speakeasy from 'speakeasy';


export default class extends Base {
  /**
   * 获取
   * @return {[type]} [description]
   */
  async getAction(){
    let type = this.get('type');
    if(type === '2fa'){
      let secret = speakeasy.generateSecret({
        length: 20,
        name: 'firekylin'
      });
      return this.success(secret.otpauth_url);
    }
    return this.success();
  }
  /**
   * 更新选项
   * @return {[type]} [description]
   */
  async putAction(){
    let data = this.post();
    if(think.isEmpty(data)){
      return this.fail('DATA_EMPTY');
    }
    //@TODO 校验权限
    
    let model = this.model('options');
    let result = await model.updateOptions(data);
    this.success(result);
  } 
}