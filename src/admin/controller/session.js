import moment from 'moment';
import crypto from 'crypto';

import base from './apiBase';
import pack from '../../../package.json';
import { ERROR } from '../constants';


const KEY = think.md5('!_firekylin_jedmeng_!');

export default class extends base {

  init(http) {
    super.init(http);

    this.modelInstance = this.model('user');
  }

  async getAction() {
    let userInfo;

    if (userInfo = this.userInfo) {
      this.success({ ...userInfo });
    } else if (userInfo = await this.getUserInfoFromCookie()) {
      this.setUserInfo(userInfo);
      this.success({ ...userInfo });
    } else {
      this.fail(400);
    }
  }

  async putAction() {    
    let userInfo = await this.session('userInfo');
    let id = userInfo.id;
    let password = this.param('password');
    let newPassword = this.param('newPassword');
    password = this.encryptPassword(password);
    newPassword = this.encryptPassword(newPassword);
    let result = await this.modelInstance.where({id, password}).update({password: newPassword});
 
    if (think.isEmpty(result)) {console.log('error');
      return this.error(ERROR.UNAUTHORIZED);
    } else {console.log('success');
      return this.success();
    }
  }

  async postAction() {
    let username = this.post('username');
    let password = this.post('password');
    let autoLogin = this.post('autoLogin');

    password = this.encryptPassword(password);

    let result = await this.modelInstance.where({username, password}).find();

    if (think.isEmpty(result)) {
      return this.error(ERROR.UNAUTHORIZED);
    } else {
      let userInfo = {
        id: result.id,
        username: result.username,
        nickname: result.nickname,
        email: result.email
      };

      await this.modelInstance.where({id: result.id}).update({
        last_login_ip: this.ip(),
        last_login_time: new Date(),
        login_count: result.login_count + 1
      });

      await this.setUserInfo(userInfo);

      if (autoLogin) {
        this.setUserCookie(result);
      }

      return this.success({ ...userInfo });
    }

  }

  async deleteAction() {
    await this.session();
    this.cookie('fk_admin', '', {
      timeout: -10000
    });
    return this.success();
  }

  async setUserInfo(userInfo) {
    this.userInfo = userInfo;
    await this.session('userInfo', userInfo);
  }

  async getUserInfoFromCookie() {
    let cookie = this.cookie('fk_admin');
    if (!cookie) {
      return false;
    }

    let token = this.decodeToken(cookie);
    let data = JSON.parse(token);

    if ((this.config('auto_login_check_ip') && data.ip !== hash(this.ip())) ||
        (this.config('auto_login_check_ua') && data.ua !== hash(this.userAgent())) ||
        ((Date.now() - data.time) >= this.config('auto_login_expires'))) {
      return false;
    }

    let result = await this.modelInstance.where({id: data.id}).find();

    if (!result) {
      return false
    } else if (this.config('auto_login_check_password') &&
        data.password != hash(result.password)) {
      return false;
    } else {
      return {
        id: result.id,
        username: result.username,
        nickname: result.nickname,
        email: result.email
      };
    }
  }

  setUserCookie(userModel) {
    let data = {
      id: userModel.id,
      ip: hash(this.ip()),
      ua: hash(this.userAgent()),
      time: Date.now(),
      password: hash(userModel.password)
    };

    let token = this.encodeToken(JSON.stringify(data));

    this.cookie('fk_admin', token, {
      path: '/admin',
      httponly: true,
      timeout: this.config('auto_login_expires')
    });

  }


  encodeToken(token) {
    let key = think.md5(KEY + think.md5(this.config('auto_login_token')));
    let cipher = crypto.createCipher('aes-256-cbc', key);
    let crypted = cipher.update(token, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
  }

  decodeToken(token) {
    let key = think.md5(KEY + think.md5(this.config('auto_login_token')));
    let decipher = crypto.createDecipher('aes-256-cbc', key);
    let dec = decipher.update(token,'hex','utf8');
    dec += decipher.final('utf8');
    return dec
  }

}

function hash(str) {
  return think.md5(str).substr(10, 5);
}
