'use strict';
import pack from '../../../package.json';

export default class extends think.controller.base {
  /**
   * init
   * @param  {[type]} http [description]
   * @return {[type]}      [description]
   */
  init(http) {
    super.init(http);
    //home view path
    this.HOME_VIEW_PATH = `${think.ROOT_PATH}${think.sep}view${think.sep}home${think.sep}`;
  }
  /**
   * some base method in here
   */
  async __before() {
    if (this.http.action === 'install') {
      return;
    }
    if (!firekylin.isInstalled) {
      return this.redirect('/index/install');
    }

    let model = this.model('options');
    let options = await model.getOptions();
    this.options = options;
    let {
      navigation,
      themeConfig
    } = options;
    try {
      navigation = JSON.parse(navigation);
    } catch (e) {
      navigation = [];
    }
    try {
      themeConfig = JSON.parse(themeConfig);
    } catch (e) {
      themeConfig = {};
    }

    //remove github pwd
    let commentConfigName = {};
    try {
      commentConfigName = JSON.parse(options.comment.name);
      delete commentConfigName.githubPassWord;
      options.comment.name = JSON.stringify(commentConfigName);
    } catch (e) {
      commentConfigName = {}
    }

    this.assign('options', options);
    this.assign('navigation', navigation);
    this.assign('themeConfig', themeConfig);
    this.assign('VERSION', pack.version);
    //set theme view root path
    let theme = options.theme || 'firekylin';
    this.THEME_VIEW_PATH = `${think.ROOT_PATH}${think.sep}www${think.sep}theme${think.sep}${theme}${think.sep}`;

    //网站地址
    let siteUrl = this.options.site_url;
    if (!siteUrl) {
      siteUrl = 'http://' + this.http.host;
    }
    this.assign('site_url', siteUrl);

    //所有的分类
    let categories = await this.model('cate').getCateArchive();
    this.assign('categories', categories);

    // 所有标签
    let tagModel = this.model('tag');
    let tagList = await tagModel.getTagArchive();
    this.assign('tags', tagList);

    // 最近10条文章
    let postModel = this.model('post');
    let lastPostList = await postModel.getLastPostList();
    this.assign('lastPostList', lastPostList);

    this.assign('currentYear', (new Date()).getFullYear());
  }
  /**
   * display view page
   * @param  {} name []
   * @return {}      []
   */
  async displayView(name) {
    if (this.http.url.match(/\.json(?:\?|$)/)) {
      let jsonOutput = {},
        assignObj = this.assign();
      Object.keys(assignObj).forEach((key) => {
        if (['controller', 'http', 'config', '_', 'options'].indexOf(key) === -1) {
          jsonOutput[key] = assignObj[key];
        }
      })

      this.type('application/json');
      return this.end(jsonOutput);
    }

    return this.display(this.THEME_VIEW_PATH + name + '.html');
  }
}
