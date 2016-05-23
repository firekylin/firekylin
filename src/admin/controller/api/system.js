import moment from 'moment';

import base from './base';
import pack from '../../../../package.json';
import request from 'request';
import semver from 'semver';
request.defaults({
  timeout: 1000,
  strictSSL: false,
  rejectUnauthorized: false
});
let reqIns = url => new Promise((resolve, reject) => request.get(url, (err, res, body) => err ? reject(res) : resolve(body)));

export default class extends base {

  init(http) {
    super.init(http);

    this.modelInstance = this.model('options');
  }

  async getAction() {
    let needUpdate = false;
    try {
      let onlineVersion = await reqIns('http://firekylin.org/release/.latest');
      if( semver.gt(onlineVersion, pack.version) ) {
        needUpdate = onlineVersion;
      }
    } catch(e) {
      console.log(e);
    }

    let mysql = await this.modelInstance.query('SELECT VERSION() as version');
    let data = {
      nodeVersion: process.versions.node,
      v8Version: process.versions.v8,
      platform: process.platform,
      thinkjsVersion: think.version,
      firekylinVersion: pack.version,
      mysqlVersion: mysql[0].version,
      needUpdate
    };
    //非管理员只统计当前用户文章
    let where = this.userInfo.type !== 1 ? {user_id: this.userInfo.id} : {};
    return this.success({
      versions: data,
      config: await this.getConfig(),
      count: {
        posts: await this.model('post').where(where).count(),
        cates: await this.model('cate').count(),
        comments: await this.model('post').where(where).sum('comment_num')
      }
    });
  }


  async getConfig() {
    let items = await this.modelInstance.select();
    let siteConfig = {};

    items.forEach(item => siteConfig[item.key] = item.value);

    return siteConfig;
  }

}
