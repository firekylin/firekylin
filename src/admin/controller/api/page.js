'use strict';

import Post from './post';

export default class extends Post {
  modelInstance = this.modelInstance.setRelation('user').where({type: 1});

  getAction(self){
    this.modelInstance.order('id DESC').page( this.get('page'), 20 );
    return super.getBaseAction(self);
  }

  async postAction(){
    let data = this.post();

    //check pathname
    let post = await this.modelInstance.where({pathname: data.pathname}).select();
    if( post.length > 0 ) {
      return this.fail('PATHNAME_EXIST');
    }

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
