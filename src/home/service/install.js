'use strict';

import fs from 'fs';
import path from 'path';

export default class extends think.service.base {
  /**
   * init
   * @param  {[type]} info [description]
   * @return {[type]}      [description]
   */
  init(dbConfig, accountConfig, ip) {
    this.dbConfig = dbConfig;
    this.dbConfig.type = 'mysql';
    this.accountConfig = accountConfig;
    this.ip = ip;
  }
  /**
   * get model
   * @return {[type]} [description]
   */
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
  /**
   *
   * @return {[type]} [description]
   */
  checkDbInfo() {
    let dbInstance = this.getModel(true);
    return dbInstance.query('SELECT VERSION()').catch(() => {
      return Promise.reject('数据库信息有误');
    });
  }
  /**
   * insert data
   * @return {[type]} [description]
   */
  async insertData() {
    let model = this.getModel(true);
    let dbExist = await model.query(
      'SELECT `TABLE_NAME` FROM `INFORMATION_SCHEMA`.`TABLES` WHERE `TABLE_SCHEMA`=\'' +
      this.dbConfig.database + '\''
    );
    if(think.isEmpty(dbExist)) {
      //忽略错误
      await model.query('CREATE DATABASE `' + this.dbConfig.database + '`').catch(() => {});
      //model.close();
    }
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
    model = this.getModel();
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

    think.log('before clear data');


    //清除已有的数据内容
    let promises = ['cate', 'post', 'post_cate', 'post_tag', 'tag', 'user'].map(item => {
      let modelInstance = this.getModel(item);
      if(modelInstance) {
        modelInstance.where('1=1').delete();
      }
    });
    await Promise.all(promises);


    let optionsModel = this.getModel('options');
    await optionsModel.where('1=1').update({value: ''});
    let salt = think.uuid(10) + '!@#$%^&*';
    this.password_salt = salt;

    await optionsModel.updateOptions('navigation', JSON.stringify([
      {'label':'首页', 'url':'/', 'option':'home'},
      {'label':'归档', 'url':'/archives/', 'option':'archive'},
      {'label':'标签', 'url':'/tags', 'option':'tags'},
      {'label':'关于', 'url':'/about', 'option':'user'},
      {'label':'友链', 'url':'/links', 'option':'link'}
    ]));
    await optionsModel.updateOptions('password_salt', salt);
    await optionsModel.updateOptions('title', 'FireKylin 系统');
    await optionsModel.updateOptions('logo_url', '/static/img/firekylin.jpg');
    await optionsModel.updateOptions('theme', 'firekylin');
    //optionsModel.close();
  }
  /**
   * update config
   * @return {[type]} [description]
   */
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
  /**
   * create account
   * @return {[type]} [description]
   */
  async createAccount() {

    let password = think.md5(this.password_salt + this.accountConfig.password);

    let model = this.getModel('user', 'admin');
    let data = {
      username: this.accountConfig.username,
      password,
      email: '',
      type: 1,
      status: 1,
      ip: this.ip
    }
    await model.addUser(data);
    //model.close();
  }
  /**
   * run
   * @return {[type]} [description]
   */
  async run() {
    await this.checkDbInfo();
    await this.insertData();
    await this.createAccount();
    this.updateConfig();
    firekylin.setInstalled();
    let optionsModel = this.getModel('options');
    await optionsModel.getOptions(true);
    //optionsModel.close();
  }
}
