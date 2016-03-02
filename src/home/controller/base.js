'use strict';

export default class extends think.controller.base {
  /**
   * init
   * @param  {[type]} http [description]
   * @return {[type]}      [description]
   */
  init(http){
    super.init(http);
    //home view path
    this.HOME_VIEW_PATH = `${think.ROOT_PATH}${think.sep}view${think.sep}home${think.sep}`;
  }
  /**
   * some base method in here
   */
  async __before(){
    let model = this.model('options');
    let options = await model.getOptions();
    this.options = options;
    this.assign('options', options);

    //set theme view root path
    let theme = options.theme || 'firekylin';
    this.THEME_VIEW_PATH = `${think.ROOT_PATH}${think.sep}www${think.sep}theme${think.sep}${theme}${think.sep}`;

    //set host
    let protocal = options.is_https ? 'https://' : 'http://';
    let host = protocal + this.http.host;
    this.assign('host', host);

    this.assign('currentYear', (new Date).getFullYear());
  }
  /**
   * display view page
   * @param  {} name []
   * @return {}      []
   */
  display(name){
    return super.display(this.THEME_VIEW_PATH + name + '.html');
  }
}