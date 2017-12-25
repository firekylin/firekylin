'use strict';

import Base from './base';

export default class extends Base {
  /**
   * 首页如果设置了自定义首页则渲染对应页面
   * @return {[type]} [description]
   */
  async indexAction() {
    let {frontPage} = await this.model('options').getOptions();
    if(frontPage) {
      this.get('pathname', frontPage);
      return this.action('post', 'page');
    }

    return this.action('post', 'list');
  }

  /**
   * 输出opensearch
   */
  opensearchAction() {
    this.http.type('text/xml');

    return this.end(`<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
    <ShortName>${this.options.title}</ShortName>
    <Description>${this.options.description}</Description>
    <Url type="text/html" template="${this.options.site_url}/search.html?s={searchTerms}" />
</OpenSearchDescription>`);
  }

  /**
   * rss
   * @return {[type]} [description]
   */
  async rssAction() {
    let model = this.model('post');
    let list = await model.getPostRssList();
    this.assign('list', list);
    this.assign('currentTime', (new Date()).toString());

    this.type('text/xml');
    return super.display(this.HOME_VIEW_PATH + 'rss.xml');
  }

  /**
   * sitemap action
   * @return {[type]} [description]
   */
  async sitemapAction() {
    let postModel = this.model('post');
    let postList = postModel.getPostSitemapList();
    this.assign('postList', postList);

    this.type('text/xml');
    return this.display(this.HOME_VIEW_PATH + 'sitemap.xml');
  }
  /**
   * install
   * @return {[type]} [description]
   */
  async installAction() {
    let step = this.param('step');
    let InstallService = this.service('install');
    let instance = new InstallService(this.ip());
    let message;

    this.assign({step});
    if(this.isGet()) {
      if(firekylin.isInstalled) {
        return this.redirect('/');
      }

      /** check db config exist */
      let dbConfig = this.config('db');
      dbConfig = dbConfig.adapter[dbConfig.type];
      let isDBConfig = think.isObject(dbConfig)
                        && dbConfig.host
                        && dbConfig.port
                        && dbConfig.database
                        && dbConfig.user;

      switch(step) {
        case 1:
          if(isDBConfig) {
            this.redirect('/index/install?step=2');
          }
        break;

        case 2:
          if(!isDBConfig) {
            this.redirect('/index/install');
          }
          if(await InstallService.checkInstalled()) {
            message = 'success';
          }
        break;
      }

      this.assign({message});
      return this.display();
    }

    if(firekylin.isInstalled) {
      return this.fail('SYSTERM_INSTALLED');
    }

    let errors = this.assign('errors');
    if(!think.isEmpty(errors)) {
      this.assign('message', errors[Object.keys(errors)[0]]);
      return this.display();
    }

    let data = this.post();

    switch(data.step) {
      case 2:
        let siteInfo = {
          title: data.title,
          site_url: data.site_url,
          username: data.username,
          password: data.password
        }
        try {
          await instance.saveSiteInfo(siteInfo);
          message = 'success';
        } catch(e) {
          message = e;
        }
      break;

      default:
        let dbInfo = {
          host: data.db_host,
          port: data.db_port,
          database: data.db_name,
          user: data.db_account,
          password: data.db_password,
          prefix: data.db_table_prefix
        };
        try {
          await instance.saveDbInfo(dbInfo);
          message = 'success';
        } catch(e) {
          message = e;
        }
      break;
    }

    this.assign('message', message);
    this.assign('data', data);
    this.display();
  }
  /**
   * 申请成为投稿者
   * @return {[type]} [description]
   */
  async contributorAction() {
    if(!this.options.hasOwnProperty('push') || +this.options.push === 0) {
      return this.fail('PUSH_CLOSED');
    }
    if(this.isGet()) {
      return this.display();
    }

    let user = this.post();
    user.type = firekylin.USER_CONTRIBUTOR;
    user.status = firekylin.USER_DISABLED;
    user.create_time = think.datetime();
    user.last_login_time = user.create_time;
    user.create_ip = this.ip();
    user.last_login_ip = this.ip();

    await this.model('user').where({name: user.name, email: user.email, _logic: 'OR'}).thenAdd(user);
    this.assign('message', 'success');
    this.display();
  }
}
