const path = require('path');
const Base = require('./base');

module.exports = class extends Base {
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
    this.ctx.type = 'text/xml';
    this.ctx.body = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
    <ShortName>${this.options.title}</ShortName>
    <Description>${this.options.description}</Description>
    <Url type="text/html" template="${this.options.site_url}/search.html?s={searchTerms}" />
</OpenSearchDescription>`;

    return true;
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

    this.ctx.type = 'text/xml';
    return super.display(path.join(this.HOME_VIEW_PATH, 'rss.xml'));
  }

  /**
   * sitemap action
   * @return {[type]} [description]
   */
  async sitemapAction() {
    let postModel = this.model('post');
    let postList = await postModel.getPostSitemapList();
    this.assign('postList', postList);

    this.ctx.type = 'text/xml';
    return super.display(path.join(this.HOME_VIEW_PATH, 'sitemap.xml'));
  }
  /**
   * install
   * @return {[type]} [description]
   */
  async installAction() {
    let step = this.get('step') || this.post('step');
    let instance = this.service('install', 'home', this.ctx.ip);
    let message;

    this.assign({step});
    if(this.isGet) {
      if(firekylin.isInstalled) {
        return this.redirect('/');
      }

      /** check db config exist */
      let dbConfig = this.config('model', undefined, 'common');
      dbConfig = dbConfig[dbConfig.type];
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
          if(await instance.checkInstalled()) {
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
        if(data.password !== data.repeatpwd) {
          message = '两次密码输入不一致请重新输入';
          break;
        }

        let siteInfo = {
          title: data.title,
          site_url: data.site_url,
          username: data.username,
          password: data.password,
          email: data.email
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
          process.send('think-cluster-reload-workers');
          message = 'success';
        } catch(e) {
          message = e;
        }
      break;
    }

    this.assign('message', message);
    this.assign('data', data);
    return this.display();
  }
  /**
   * 申请成为投稿者
   * @return {[type]} [description]
   */
  async contributorAction() {
    if(!this.options.hasOwnProperty('push') || +this.options.push === 0) {
      return this.fail('PUSH_CLOSED');
    }
    if(this.isGet) {
      return this.display();
    }

    let user = this.post();
    user.type = firekylin.USER_CONTRIBUTOR;
    user.status = firekylin.USER_DISABLED;
    user.create_time = think.datetime();
    user.last_login_time = user.create_time;
    user.create_ip = this.ctx.ip;
    user.last_login_ip = this.ctx.ip;

    await this.model('user').where({name: user.name, email: user.email, _logic: 'OR'}).thenAdd(user);
    this.assign('message', 'success');
    this.display();
  }
}
