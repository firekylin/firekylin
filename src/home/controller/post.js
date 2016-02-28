'use strict';

import Base from './base.js';


export default class extends Base {
  /**
   * post list
   * @return {Promise} []
   */
  async listAction(){
    let model = this.model('post');
    let list = await model.getPostList(this.get('page'), {});
    this.assign('postList', list);
    return this.display();
  }
  /**
   * post detail
   * @return {[type]} [description]
   */
  async detailAction(){
    let pathname = this.get('pathname');
    let detail = await this.model('post').where({pathname: pathname}).find();
    this.assign('detail', detail);

    let pageUrl = this.options.is_https ? 'https://' : 'http://';
    pageUrl += this.http.host + this.http.url;
    this.assign('pageUrl', pageUrl);
    
    return this.display();
  }

  async pageAction(){
    let pathname = this.get('pathname');
    let detail = await this.model('post').where({pathname: pathname}).find();
    this.assign('page', detail);

    return this.display();
  }

  async archiveAction(){

    return this.display();
  }
}