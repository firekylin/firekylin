import moment from 'moment';

import base from './apiBase';
import pack from '../../../package.json';


export default class extends base {

  async getAction() {
    let userInfo = await this.session('userInfo');

    return this.success({ userInfo });
  }

  async putAction() {
    return this.__call();
  }

  async postAction() {
    let username = this.post('username');
    let password = this.post('password');

    return this.__call();
  }

  deleteAction() {
    return this.__call();
  }

}