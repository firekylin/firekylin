'use strict';

import Base from './base.js';


export default class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction(){
    let model = this.model('post');
    let list = await model.getPostList(this.get('page'), {});
    this.assign('postList', list);
    return this.display();
  }
}