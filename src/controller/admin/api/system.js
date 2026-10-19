const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');
const {Readable} = require('stream');
const {pipeline} = require('stream/promises');
const semver = require('semver');
const pack = require('../../../../package.json');
const Base = require('./base');
const {getMcpConfig} = require('../../../mcp/config');

async function fetchWithTimeout(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(1000)});
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response;
}

module.exports = class extends Base {
  constructor(...args) {
    super(...args);
    this.modelInstance = this.model('options');
  }

  async getAction() {
    let needUpdate = false;
    try {
      const response = await fetchWithTimeout('http://firekylin.lithub.cc/release/v1/.latest');
      const onlineVersion = (await response.text()).trim();
      if (semver.gt(onlineVersion, pack.version)) {
        needUpdate = onlineVersion;
      }
    } catch (e) {
      console.log(e); // eslint-disable-line no-console
    }

    const mysql = await this.modelInstance.query(`SELECT ${this.config('model').type === 'sqlite' ? 'sqlite_version()' : 'VERSION()'} as version`);
    const data = {
      nodeVersion: process.versions.node,
      v8Version: process.versions.v8,
      platform: process.platform,
      thinkjsVersion: think.version,
      firekylinVersion: pack.version,
      mysqlVersion: mysql[0].version,
      needUpdate
    };

    // 非管理员只统计当前用户文章
    const where = this.userInfo.type !== 1 ? {user_id: this.userInfo.id} : {};
    const config = await this.getConfig();
    delete config.password_salt;
    delete config.jwt_secret;
    delete config.comment_jwt_secret;
    delete config.comment_schema_version;

    return this.success({
      versions: data,
      config,
      mcpEnabled: getMcpConfig().enabled !== false,
      count: {
        posts: await this.model('post').where(where).count(),
        cates: await this.model('cate').count(),
        comments: await this.model('post').where(where).sum('comment_num')
      }
    });
  }

  async updateAction() {
    if (/^win/.test(process.platform)) {
      return this.fail('PLATFORM_NOT_SUPPORT');
    }

    const {step} = this.get();
    switch (step) {
      /** 下载文件 */
      case '1':
      default:
        return fetchWithTimeout('http://firekylin.lithub.cc/release/v1/latest.tar.gz')
          .then(response => {
            if (!response.body) {
              throw new Error('Release response has no body');
            }
            return pipeline(
              Readable.fromWeb(response.body),
              fs.createWriteStream(path.join(think.RESOURCE_PATH, 'latest.tar.gz'))
            );
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
            if (error) {
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
        const registry = think.config('registry') || 'https://registry.npmmirror.com';
        return new Promise((resolve, reject) => {
          exec(`npm install --registry=${registry}`, error => {
            if (error) {
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
    const items = await this.modelInstance.select();
    const siteConfig = {};

    items.forEach(item => {
      siteConfig[item.key] = item.value;
    });

    return siteConfig;
  }
};
