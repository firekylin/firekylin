const fs = require('fs');
const path = require('path');
const semver = require('semver');
const pack = require('../../../../package.json');
const Base = require('./base');
const {CREDENTIAL_PREFIX} = require('../../../ai/store');

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
      const response = await fetchWithTimeout('https://registry.npmjs.org/firekylin/latest');
      const onlineVersion = (await response.json()).version;
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
    delete config.ai_credentials;
    for (const key of Object.keys(config)) {
      if (key.startsWith(CREDENTIAL_PREFIX)) delete config[key];
    }

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
    if (Number(this.userInfo?.type) !== 1) return this.fail('USER_NO_PERMISSION');
    const adminAuth = require('../../../service/admin-auth');
    if (this.ctx.method !== 'POST' || !this.ctx.get('X-CSRF-Token') ||
        this.ctx.get('X-CSRF-Token') !== adminAuth.csrfToken(this.ctx)) {
      return this.ctx.throw(403, 'CSRF validation failed');
    }
    try {
      const response = await fetchWithTimeout('https://registry.npmjs.org/firekylin/latest');
      const release = await response.json();
      const version = release.version;
      if (!semver.valid(version) || !semver.gt(version, pack.version)) throw new Error('VERSION_NOT_NEWER');
      const {ExtensionGitHub} = require('../../../service/extension-github');
      const connection = await new ExtensionGitHub(this.modelInstance).connection();
      if (connection) {
        const {GitHubExtensionDispatch} = require('../../../service/github-extension-dispatch');
        const result = await new GitHubExtensionDispatch({connection}).dispatch({operation: 'core.update', version});
        return this.success(result);
      }
      const {PluginInstaller} = require('../../../service/plugin-installer');
      const projectPath = process.env.FIREKYLIN_PROJECT_PATH || think.ROOT_PATH;
      const manifest = JSON.parse(await fs.promises.readFile(path.join(projectPath, 'package.json'), 'utf8'));
      if (!manifest.dependencies?.firekylin) throw new Error('源码安装请使用手动更新');
      const installer = new PluginInstaller({projectPath, readOnly: Boolean(process.env.VERCEL)});
      await installer.mutate(['add', '--save-exact', 'firekylin@' + version]);
      const restartRequired = typeof process.send !== 'function';
      this.success({restartRequired});
      if (!restartRequired) setTimeout(() => process.send('think-cluster-reload-workers'), 1000);
    } catch (error) {
      return this.fail(error.message);
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
