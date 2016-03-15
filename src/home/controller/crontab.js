'use strict';

import Base from './base.js';
import fs from 'fs';


export default class extends Base {
  /**
   * sitemap action
   * @return {[type]} [description]
   */
  async sitemapAction(){
    let model = this.model('post');
    let list = model.getPostSitemapList();
    this.assign('list', list);
    let content = await this.fetch(this.HOME_VIEW_PATH + 'sitemap.xml');
    let filePath = think.RESOURCE_PATH + think.sep + 'sitemap.xml';
    fs.writeFile(filePath, content);
    return this.success();
  }
  /**
   * sync comment num
   * @return {[type]} [description]
   */
  async syncCommentAction(){
    let SyncService = this.service('comment');
    let instance = new SyncService();
    await instance.sync();
    this.success();
  }
}