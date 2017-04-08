import fs from 'fs';
import path from 'path';
import {exec} from 'child_process';
import semver from 'semver';
import request from 'request';
import pack from '../../../../package.json';
import base from './base';

const cluster = require('cluster');

request.defaults({
  timeout: 1000,
  strictSSL: false,
  rejectUnauthorized: false
});

const reqIns = think.promisify(request.get);

export default class extends base {

  init(http) {
    super.init(http);

    this.modelInstance = this.model('options');
  }

  async getAction() {
    let needUpdate = false;
    try {
      let res = await reqIns('http://firekylin.org/release/.latest');
      let onlineVersion = res.body.trim();
      if(semver.gt(onlineVersion, pack.version)) {
        needUpdate = onlineVersion;
      }
    } catch(e) {
      console.log(e);  // eslint-disable-line no-console
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

  async updateAction() {
    if(/^win/.test(process.platform)) {
      return this.fail('PLATFORM_NOT_SUPPORT');
    }

    let {step} = this.get();
    switch(step) {
      /** 下载文件 */
      case '1':
      default:
        return request({uri: 'http://firekylin.org/release/latest.tar.gz'})
          .pipe(fs.createWriteStream(path.join(think.RESOURCE_PATH, 'latest.tar.gz')))
          .on('close', () => this.success())
          .on('error', err => this.fail(err));

      /** 解压覆盖，删除更新文件 */
      case '2':
        return exec(`
          cd ${think.RESOURCE_PATH};
          tar zvxf latest.tar.gz;
          cp -r firekylin/* ../;
          rm -rf firekylin latest.tar.gz`, error => {
          if(error) {
            this.fail(error);
          }

          this.success();
        });

      /** 安装依赖 */
      case '3':
        let registry = think.config('registry') || 'https://registry.npm.taobao.org';
        return exec(`npm install --registry=${registry}`, error => {
          if(error) {
            this.fail(error);
          }

          this.success();
        });

      /** 重启服务 */
      case '4':
        if(cluster.isWorker) {
          this.success();
          setTimeout(() => cluster.worker.kill(), 200);
        }

        break;
    }
  }

  async getConfig() {
    let items = await this.modelInstance.select();
    let siteConfig = {};

    items.forEach(item => siteConfig[item.key] = item.value);

    return siteConfig;
  }

}
