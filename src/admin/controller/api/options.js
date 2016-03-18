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
      let model = this.model('options');
      let options = await model.getOptions();
      if(options.two_factor_auth.length === 32){
        return this.success({
          otpauth_url: 'otpauth://totp/firekylin?secret=' + options.two_factor_auth,
          secret: options.two_factor_auth
        })
      }else{
        let secret = speakeasy.generateSecret({
          length: 20,
          name: 'firekylin'
        });
        return this.success({
          otpauth_url: secret.otpauth_url,
          secret: secret.base32
        });
      }
      
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
    
    let model = this.model('options');
    let result = await model.updateOptions(data);
    this.success(result);
  } 
}