'use strict';

import fs from 'fs';
import path from 'path';
import semver from 'semver';

class InstallService extends think.service.base {
  constructor(ip) {
    super(ip);
    this.ip = ip;

    let dbConfig = think.config('db');
    if(think.isObject(dbConfig.adapter) && think.isObject(dbConfig.adapter[dbConfig.type])) {
      this.dbConfig = dbConfig.adapter[dbConfig.type];
    }
  }

  getModel(name, module) {
    let dbConfig
    if(name === true) {
      dbConfig = think.extend({}, this.dbConfig);
      dbConfig.database = '';
      name = '';
    }else{
      dbConfig = this.dbConfig;
    }
    return this.model(name || 'user', {
      adapter: {
        mysql: dbConfig
      }
    }, module)
  }

  checkDbInfo() {
    let dbInstance = this.getModel(true);
    return dbInstance.query('SELECT VERSION()').catch(() => {
      return Promise.reject('数据库信息有误');
    }).then(data => {
      let version;
      try {
        /** version compatible, set encoding utf8mb4 when MySQL larger than 5.5.3 */
        version = data[0]['VERSION()'].match(/^[\d.]/);
        if(think.isArray(version)) {
          version = data[0]['VERSION()'];
        } else {
          version = version[0];
        }

        this.dbConfig.encoding = semver.gt(version, '5.5.3') ? 'utf8mb4' : 'utf8';
      } catch(e) {
        this.dbConfig.encoding = 'utf8';
      }
      return version;
    });
  }

  async insertData(title, site_url) {
    let dbFile = think.ROOT_PATH + think.sep + 'firekylin.sql';
    if(!think.isFile(dbFile)) {
      return Promise.reject('数据库文件（firekylin.sql）不存在，请重新下载');
    }


    let content = fs.readFileSync(dbFile, 'utf8');
    content = content.split('\n').filter(item => {
      item = item.trim();
      let ignoreList = ['#', 'LOCK', 'UNLOCK'];
      for(let it of ignoreList) {
        if(item.indexOf(it) === 0) {
          return false;
        }
      }
      return true;
    }).join(' ');
    content = content.replace(/\/\*.*?\*\//g, '').replace(/fk_/g, this.dbConfig.prefix || '');

    //导入数据
    let model = this.getModel();
    content = content.split(';');
    try{
      for(let item of content) {
        item = item.trim();
        if(item) {
          think.log(item);
          await model.query(item);
        }
      }
    }catch(e) {
      think.log(e);
      return Promise.reject('数据表导入失败，请在控制台下查看具体的错误信息，并在 GitHub 上发 issue。');
    }

    let optionsModel = this.getModel('options');
    await optionsModel.where('1=1').update({value: ''});
    let salt = think.uuid(10) + '!@#$%^&*';
    this.password_salt = salt;

    await optionsModel.updateOptions('title', title);
    await optionsModel.updateOptions('site_url', site_url);
    await optionsModel.updateOptions('navigation', JSON.stringify([
      {'label':'首页', 'url':'/', 'option':'home'},
      {'label':'归档', 'url':'/archives/', 'option':'archive'},
      {'label':'标签', 'url':'/tags', 'option':'tags'},
      {'label':'关于', 'url':'/about', 'option':'user'},
      {'label':'友链', 'url':'/links', 'option':'link'}
    ]));
    await optionsModel.updateOptions('password_salt', salt);
    await optionsModel.updateOptions('logo_url', '/static/img/firekylin.jpg');
    await optionsModel.updateOptions('theme', 'firekylin');
    //optionsModel.close();
  }

  updateConfig() {
    let data = {
      type: 'mysql',
      adapter: {
        mysql: this.dbConfig
      }
    }
    let content = `
      "use strict";
      exports.__esModule = true;
      exports.default = ${JSON.stringify(data, undefined, 4)}
    `;

    let dbConfigFile;
    try {
      let srcPath = path.join(think.ROOT_PATH, 'src/common/config');
      fs.statSync(srcPath);
      dbConfigFile = path.join(srcPath, 'db.js');
    } catch(e) {
      dbConfigFile = path.join(think.APP_PATH, '/common/config/db.js');
    }
    fs.writeFileSync(dbConfigFile, content);
    think.config('db', data);
  }

  async createAccount(username, password) {
    password = think.md5(this.password_salt + password);

    let model = this.getModel('user', 'admin');
    let data = {
      username,
      password,
      email: '',
      type: 1,
      status: 1,
      ip: this.ip
    }
    await model.addUser(data);
    //model.close();
  }

  async saveDbInfo(dbConfig) {
    this.dbConfig = dbConfig;
    this.dbConfig.type = 'mysql';
    await this.checkDbInfo();
    this.updateConfig();
  }

  async saveSiteInfo({title, site_url, username, password}) {
    await this.insertData(title, site_url);
    await this.createAccount(username, password);

    firekylin.setInstalled();

    let optionsModel = this.getModel('options');
    await optionsModel.getOptions(true);
    //optionsModel.close();
  }
}

const tables = ['cate', 'post', 'post_cate', 'post_tag', 'tag', 'user'];
InstallService.checkInstalled = async function() {
  let dbConfig = think.config('db');
  let database = dbConfig.database;
  let prefix = dbConfig.prefix;
  if(!database && think.isObject(dbConfig.adapter) && think.isObject(dbConfig.adapter[dbConfig.type])) {
    database = dbConfig.adapter[dbConfig.type].database;
    prefix = dbConfig.adapter[dbConfig.type].prefix;
  }

  try {
    let existTables = await think.model('user', dbConfig).query(
      'SELECT `TABLE_NAME` FROM `INFORMATION_SCHEMA`.`TABLES` WHERE `TABLE_SCHEMA`=\'' +
      database + '\''
    );
    if(think.isEmpty(existTables)) {
      return false;
    }

    existTables = existTables.map(table => table.TABLE_NAME);
    let installed = tables.every(table => existTables.indexOf(prefix+table) > -1);
    if(installed) {
      firekylin.setInstalled();
    }
    return installed;
  } catch(e) {
    think.log(e);
    return false;
  }
};

export default InstallService;
