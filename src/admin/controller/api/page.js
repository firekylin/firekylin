'use strict';

import Post from './post';

export default class extends Post {
  modelInstance = this.modelInstance.setRelation('user');

  getAction(self){
    this.modelInstance.where({type: 1}).order('id DESC').page( this.get('page'), 20 );
    return super.getAction(self);
  }

  async postAction(){
    let data = this.post();
    data.user_id = this.userInfo.id;
    data = this.getContentAndSummary(data);
    data = this.getPostTime(data);
    data.type = 1;

    let insertId = await this.modelInstance.addPost(data);
    return this.success({id: insertId});
  }

  async putAction(){
    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }
    let data = this.post();
    data.id = this.id;
    data.type = 1;
    data = this.getContentAndSummary(data);
    data = this.getPostTime(data);

    let rows = await this.modelInstance.savePost(data);
    return this.success({affectedRows: rows});
  }

}
