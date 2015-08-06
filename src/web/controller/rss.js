import base from './base';


const DEFAULT_RSS_NUMBER = 10;

export default class extends base {

  init(http) {
    super.init(http);
    this.modelInstance = this.model('post');
  }

  async atomAction() {

    this.config(this.siteConfig);

    if (!this.siteConfig.rss_on) {
      return this._404Action();
    }

    let list = await this.modelInstance
        .limit(0, this.siteConfig.rss_number || DEFAULT_RSS_NUMBER)
        .order('`date` DESC')
        .select();

    await this.implementPosts(list);

    let updateTime = await this.modelInstance
        .order('`modify_date` DESC')
        .getField('modify_date', true);

    this.assign('list', list);
    this.assign('updateTime', updateTime);

    this.header("Content-Type", "text/xml");
    return this.display('atom.xml');
  }

}