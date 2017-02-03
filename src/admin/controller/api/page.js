'use strict';

import Post from './post';

export default class extends Post {
  modelInstance = this.modelInstance.setRelation('user').where({type: 1});

  getAction(self){
    if( !this.id ) {
      let field = ['id', 'title', 'user_id', 'create_time', 'update_time', 'status', 'pathname', 'is_public'];
      this.modelInstance.order('create_time DESC').field(field);
    }

    if( this.get('page') !== '-1' ) {
      this.modelInstance.page( this.get('page'), 20 );
    }
    return super.getBaseAction(self);
  }

  async postAction(){
    let data = this.post();

    //check pathname
    let post = await this.modelInstance.where({pathname: data.pathname}).select();
    if( post.length > 0 ) {
      return this.fail('PATHNAME_EXIST');
    }

    data.type = 1;
    data.user_id = this.userInfo.id;
    data = await this.getContentAndSummary(data);
    data = this.getPostTime(data);
    
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
    data = await this.getContentAndSummary(data);
    data = this.getPostTime(data);

    let rows = await this.modelInstance.savePost(data);
    return this.success({affectedRows: rows});
  }

}
