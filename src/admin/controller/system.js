import moment from 'moment';

import base from './apiBase';


export default class extends base {

  async getAction() {

    let mysql = await this.modelInstance.query('SELECT VERSION() as version');

    let data = {
      nodeVersion: process.versions.node,
      v8Version: process.versions.v8,
      platform: process.platform,
      thinkjsVersion: think.version,
      firekylinVersion: this.config('version'),
      mysqlVersion: mysql[0].version
    };

    return this.success(data);
  }

  putAction() {
    return this.__call();
  }

  postAction() {
    return this.__call();
  }

  deleteAction() {
    return this.__call();
  }

}