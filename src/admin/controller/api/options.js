'use strict';
import Base from './base.js';
import request from 'request';
import speakeasy from 'speakeasy';
import {PasswordHash} from 'phpass';


export default class extends Base {
  /**
   * 获取
   * @return {[type]} [description]
   */
  async getAction(){
    let type = this.get('type');
    let model = this.model('options');
    let options = await model.getOptions();

    if(type === '2fa'){
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
    } else if(type === 'push') {
      let push_sites = await this.getPushSites();
      let result = this.get('key') ? push_sites[this.get('key')] : Object.values(push_sites);
      return this.success(result);
    }
    return this.success();
  }

  postAction(){
    let type = this.get('type');
    if(type === '2faAuth'){
      let data = this.post();
      let verified = speakeasy.totp.verify({
        secret: data.secret,
        encoding: 'base32',
        token: data.code,
        window: 2
      });
      return verified ? this.success() : this.fail('TWO_FACTOR_AUTH_ERROR_DETAIL');
    } else if(type === 'push') {
      let data = this.post();
      return this.setPushSites(data.appKey, data);
    }
    return super.postAction(this);
  }
  /**
   * 更新选项
   * @return {[type]} [description]
   */
  async putAction(){
    let type = this.get('type');
    let data = this.post();
    if(think.isEmpty(data)){
      return this.fail('DATA_EMPTY');
    }

    let model = this.model('options');
    if( type === 'push' ) {
      return this.setPushSites(data.appKey, data, false);
    } else {
      let result = await model.updateOptions(data);
      this.success(result);
    }
  }

  async deleteAction() {
    let type = this.get('type');
    if( type === 'push' ) {
      let key = this.get('key');
      if( think.isEmpty(key) ) {
        return this.fail('KEY_EMPTY');
      }
      return this.setPushSites(key, null, false);
    } else {
      return super.deleteAction();
    }
  }

  async getPushSites() {
    let options = await this.model('options').getOptions();
    return options.push_sites ? JSON.parse(options.push_sites) : {};
  }

  async setPushSites(key, data, only = true) {
    let push_sites = await this.getPushSites();
    if( only && push_sites.hasOwnProperty(key) ) {
      return this.fail('KEY_EXIST');
    }

    if( data === null ) {
      delete push_sites[key];
    } else {
      /** 需要增加验证 key 正确性的请求 **/
      let reqInstance = think.promisify(request.get);
      let {appKey, appSecret} = data;
      let auth_key = (new PasswordHash).hashPassword(`${appSecret}Firekylin`);
      let checkUrl = `${data.url}/admin/post_push?app_key=${appKey}&auth_key=${auth_key}`;
      let result = await reqInstance(checkUrl);
      try{
        result = JSON.parse(result.body);
      }catch(e){
        return this.fail('APP_KEY_SECRET_ERROR');
      }
      
      if( !result.errno ) {
        push_sites[key] = data;
      } else {
        return this.fail(result.errmsg);
      }
    }

    let result = await this.model('options').updateOptions('push_sites', JSON.stringify(push_sites));
    return this.success(result);
  }
}
