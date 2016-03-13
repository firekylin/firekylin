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
    if(this.http.action === 'install'){
      return;
    }
    if(!firekylin.isInstalled){
      return this.redirect('/index/install');
    }
    
    let model = this.model('options');
    let options = await model.getOptions();
    this.options = options;
    this.assign('options', options);

    //set theme view root path
    let theme = options.theme || 'firekylin';
    this.THEME_VIEW_PATH = `${think.ROOT_PATH}${think.sep}www${think.sep}theme${think.sep}${theme}${think.sep}`;

    //set protocol
    let protocol = options.is_https ? 'https://' : 'http://';
    this.assign('protocol', protocol);

    this.assign('currentYear', (new Date).getFullYear());
  }
  /**
   * display view page
   * @param  {} name []
   * @return {}      []
   */
  displayView(name){
    return this.display(this.THEME_VIEW_PATH + name + '.html');
  }
}