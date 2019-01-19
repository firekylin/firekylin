const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');
const semver = require('semver');
const request = require('request');
const pack = require('../../../../package.json');
const Base = require('./base');

const reqIns = request.defaults({
  timeout: 1000,
  strictSSL: false,
  rejectUnauthorized: false
});

const reqInsAsync = think.promisify(reqIns.get);

module.exports = class extends Base {

  constructor(...args) {
    super(...args);
    this.modelInstance = this.model('options');
  }

  async getAction() {
    let needUpdate = false;
    try {
      let res = await reqInsAsync('http://firekylin.org/release/v1/.latest');
      let onlineVersion = res.body.trim();
      if(semver.gt(onlineVersion, pack.version)) {
        needUpdate = onlineVersion;
      }
    } catch(e) {
      console.log(e); // eslint-disable-line no-console
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
    const config = await this.getConfig();
    delete config.password_salt;

    return this.success({
      versions: data,
      config,
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
        return new Promise((resolve, reject) => {
          reqIns({uri: 'http://firekylin.org/release/v1/latest.tar.gz'})
          .pipe(fs.createWriteStream(path.join(think.RESOURCE_PATH, 'latest.tar.gz')))
          .on('close', resolve)
          .on('error', reject)
        }).then(
          () => this.success(),
          ({message}) => this.fail(message)
        );

      /** 解压覆盖，删除更新文件 */
      case '2':
        return new Promise((resolve, reject) => {
          exec(`
          cd ${think.RESOURCE_PATH};
          tar zvxf latest.tar.gz;
          cp -r firekylin/* ../;
          rm -rf firekylin latest.tar.gz`, error => {
            if(error) {
              reject(error);
            }
            resolve();
          });
        }).then(
          () => this.success(),
          ({message}) => this.fail(message)
        );

      /** 安装依赖 */
      case '3':
        const registry = think.config('registry') || 'https://registry.npm.taobao.org';
        return new Promise((resolve, reject) => {
          exec(`npm install --registry=${registry}`, error => {
            if(error) {
              reject(error);
            }
            resolve();
          });
        }).then(
          () => this.success(),
          ({message}) => this.fail(message)
        );

      /** 重启服务 */
      case '4':
        process.send('think-cluster-reload-workers');
        this.success();
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
