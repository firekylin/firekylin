'use strict';

import Base from './base';
/**
 * relation model
 */
export default class extends Base {
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
        // fKey: 'user_id',
        // key: 'display_name',
        field: 'id,name,display_name'
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
    data = Object.assign({
      type: 0,
      status: 0,
      create_time,
      update_time: create_time,
      is_public: 1
    }, data);

    return this.where({pathname: data.pathname, _logic: 'OR'}).thenAdd(data);
  }

  async savePost(data){
    let info = await this.where({id: data.id}).find();
    if(think.isEmpty(info)){
      return Promise.reject(new Error('POST_NOT_EXIST'));
    }
    data.update_time = think.datetime();
    return this.where({id: data.id}).update(data);
  }

  async deletePost(post_id) {
    //await this.model('post_cate').delete({post_id});
    //await this.model('post_tag').delete({post_id});
    return this.where({id: post_id}).delete();
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
  getLatest(user_id, nums = 10){
    let where = {
      create_time: {'<=': think.datetime()},
      is_public: 1, //公开
      type: 0, //文章
      status: 3, //已经发布
    };
    if(user_id) { where.user_id = user_id; }
    return this.order('id DESC').where(where).limit(nums).setRelation(false).order('create_time DESC').select();
  }

  async afterUpdate(data, options) {
    await super.afterUpdate(data, options);
    return this.clearCache();
  }

  async afterDelete(data, options) {
    await super.afterDelete(data, options);
    return this.clearCache();
  }

  async afterAdd(data, options) {
    await super.afterAdd(data, options);
    return this.clearCache();
  }

  clearCache() {
    think.log('clear cache');
    return think.cache('post_1', null);
  }
}
