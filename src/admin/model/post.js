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
      cate: think.model.MANY_TO_MANY
    }
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