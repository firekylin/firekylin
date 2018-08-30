const fs = require('fs');
const path = require('path');
const semver = require('semver');

const tables = ['cate', 'post', 'post_cate', 'post_tag', 'tag', 'user'];
const startPost = `
这是程序自动发布的文章。如果您看到这篇文章，表示您的 Blog 已经安装成功！

如果您对 Firekylin 不是很熟悉，可以先阅读以下常用操作了解一下。

<!--more-->

## 常用操作
### 登录后台
Firekylin 的后台登录入口在 [~/admin](/admin)

### 网站基本设置
后台的 [系统设置](/admin/options/) 提供了与网站相关的选项，例如可在其中的 [基本设置](/admin/options/general) 中设置网站名称、Logo地址等。  
更多的设置，请参考 [官方 WIKI](https://github.com/firekylin/firekylin/wiki/) 的 [系统设置](https://github.com/firekylin/firekylin/wiki/系统设置)

### 评论设置
Firekylin 没有内置评论模块。但是，Firekylin 可方便地使用第三方评论系统。在后台的 [系统设置](/admin/options/) 的 [评论设置](/admin/options/comment) 的 \`自定义\` 模式下粘贴第三方评论系统的代码即可。

Firekylin 还对 [Disqus](https://disqus.com/) 、[畅言](https://changyan.kuaizhan.com/) 、[网易云跟帖](https://gentie.163.com/)  提供了特别的支持，只需要填写对应的网站id即可，不需要粘贴具体的代码。

### 菜单管理
后台的 [外观设置](admin/appearance/) 可进行 [菜单管理](/admin/appearance/navigation)，包括新增菜单、删除菜单、菜单排序等。  
新增菜单时，如填写了菜单属性（例如属性为 \`home\`），Firekylin 自带的主题会从图标库尝试寻找 \`icon-home\` 作为该菜单的图标，如未查到匹配的则不会显示图标。

### 主题外观
Firekylin 目前只带了一套主题，所以基于 Firekylin 架构的网站长得都差不多^_^  
主题外观的使用、修改、创建可参考官网 WIKI 的 [主题外观](https://github.com/firekylin/firekylin/wiki/主题外观)。  
欢迎越来越多的热心用户为 Firekylin 开发主题外观，开发手册详见 [主题开发]( https://github.com/firekylin/firekylin/wiki/主题开发)。

## Markdown 简介
Firekylin 的编辑器为支持 Markdown 语法的编辑器。Markdown 是一种简化的标记语言，普通的纯文本内容（例如 Windows 的记事本撰写的内容）经过 Markdown 标记之后，可被渲染成赏心悦目的富格式文本。

Markdown 的格式说明可参考：[英文版](https://guides.github.com/features/mastering-markdown/)、[中文版](https://coding.net/help/doc/project/markdown.html)

好了，介绍就这么多，快开始你的 Blog 之旅吧！
`;

module.exports = class extends think.Service {
  constructor(ip) {
    super(ip);
    this.ip = ip;

    let dbConfig = think.config('model');
    this.type = dbConfig.type || 'mysql';

    if(think.isObject(dbConfig[this.type])) {
      this.dbConfig = dbConfig[this.type];
    }
  }

  getModel(name, module) {
    let dbConfig;
    if(name === true) {
      dbConfig = think.extend({}, this.dbConfig);
      dbConfig.database = '';
      name = '';
    }else{
      dbConfig = this.dbConfig;
    }
    return this.model(name || 'user', {
      type: this.type,
      [this.type]: dbConfig
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
    let model = this.getModel(true);
    let dbExist = await model.query(
      'SELECT `TABLE_NAME` FROM `INFORMATION_SCHEMA`.`TABLES` WHERE `TABLE_SCHEMA`= \''+
      this.dbConfig.database + '\''
    );
    if(think.isEmpty(dbExist)) {
      await model.query('CREATE DATABASE `' + this.dbConfig.database + '`').catch(() => {});
    }

    let dbFile = path.join(think.ROOT_PATH, 'firekylin.sql');
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
          think.logger.debug(item);
          await model.query(item);
        }
      }
    }catch(e) {
      think.logger.error(e);
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
      type: this.type,
      adapter: {
        [this.type]: this.dbConfig
      }
    };
    let content = `"use strict";
exports.__esModule = true;
exports.default = ${JSON.stringify(data, undefined, 4)}
    `;

    const dbConfigFile = path.join(think.ROOT_PATH, 'src/common/config/db.js');
    fs.writeFileSync(dbConfigFile, content);

    for(const i in this.dbConfig) {
      think.config(`model.${this.type}.${i}`, this.dbConfig[i], 'common');
    }
    // think.config('model', {
    //   type: this.type,
    //   [this.type]: this.dbConfig
    // });
  }

  async createAccount(username, password, email) {
    password = think.md5(this.password_salt + password);

    let model = this.getModel('user', 'admin');
    let data = {
      username,
      password,
      email,
      type: 1,
      status: 1,
      ip: this.ip
    }
    await model.addUser(data);
    //model.close();
  }

  async addStartPost() {
    let postModel = this.getModel('post', 'admin');
    let data = {
      type: 0,
      status: 3,
      user_id: 1,
      is_public: 1,
      comment_num: 0,
      allow_comment: 1,
      title: '欢迎使用 Firekylin',
      markdown_content:startPost,
      create_time: think.datetime(),
      update_time: think.datetime(),
      pathname: 'hello-world-via-firekylin'
    };

    data = await postModel.getContentAndSummary(data);
    let insert = await postModel.addPost(data);
    return insert;
  }

  async saveDbInfo(dbConfig) {
    this.dbConfig = dbConfig;
    await this.checkDbInfo();
    this.updateConfig();
  }

  async saveSiteInfo({title, site_url, username, password, email}) {
    await this.insertData(title, site_url);
    await this.createAccount(username, password, email);
    await this.addStartPost();

    firekylin.setInstalled();

    let optionsModel = this.getModel('options');
    await optionsModel.getOptions(true);
    //optionsModel.close();
  }

  async checkInstalled() {
    let dbConfig = think.config('model');
    let database = dbConfig.database;
    let prefix = dbConfig.prefix;
    if(!database && think.isObject(dbConfig[dbConfig.type])) {
      database = dbConfig[dbConfig.type].database;
      prefix = dbConfig[dbConfig.type].prefix;
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
      think.logger.error(e);
      return false;
    }
  }
};
