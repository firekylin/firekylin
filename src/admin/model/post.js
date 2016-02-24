'use strict';
/**
 * relation model
 */
export default class extends think.model.relation {
  /**
   * init
   * @param  {} args []
   * @return {}         []
   */
  init(...args){
    super.init(...args);

    this.relation = {
      tag: think.model.MANY_TO_MANY,
      cate: think.model.MANY_TO_MANY,
      user: {
        type: think.model.BELONG_TO,
        fKey: 'user_id',
        key: 'display_name',
        field: 'id,display_name'
      }
    }
  }

  /**
   * 添加文章
   * @param {[type]} data [description]
   * @param {[type]} ip   [description]
   */
  addPost(data){
    let create_time = think.datetime();
    return this.where({pathname: data.pathname, _logic: 'OR'}).thenAdd({
      user_id: 2,
      type: 0,
      status: 0,
      title: data.title,
      pathname: data.pathname,
      summary: 'abc',
      markdown_content: 'abc',
      content: data.content,
      allow_comment: 1,
      create_time,
      update_time: create_time,
      is_public: 1
    });
  }

  /**
   * get count posts
   * @param  {Number} userId []
   * @return {Promise}        []
   */
  getCount(userId){
    if(userId){
      return this.where({user_id: userId}).count();
    }
    return this.count();
  }
  /**
   * get latest posts
   * @param  {Number} nums []
   * @return {}      []
   */
  getLatest(nums = 5){
    return this.order('id DESC').limit(nums).setRelation(false).select();
  }
}
