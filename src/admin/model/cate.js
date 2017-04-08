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
  init(...args) {
    super.init(...args);

    this.relation = {
      post_cate: {
        type: think.model.HAS_MANY,
        fKey: 'cate_id'
      }
    }
  }

  /**
   * 添加分类
   * @param {[type]} data [description]
   * @param {[type]} ip   [description]
   */
  addCate(data) {
    let where = {
      name: data.name,
      _logic: 'OR'
    };
    if(data.pathname) {
      where.pathname = data.pathname;
    }
    return this.where(where).thenAdd(data);
  }

  async saveCate(data) {
    let info = await this.where({id: data.id}).find();
    if(think.isEmpty(info)) {
      return Promise.reject(new Error('CATE_NOT_EXIST'));
    }

    return this.where({id: data.id}).update(data);
  }

  async deleteCate(cate_id) {
    this.model('post_cate').where({cate_id}).delete();
    return this.where({id: cate_id}).delete();
  }
  /**
   * get count posts
   * @param  {Number} userId []
   * @return {Promise}        []
   */
  getCount(userId) {
    if(userId) {
      return this.where({user_id: userId}).count();
    }
    return this.count();
  }
}
