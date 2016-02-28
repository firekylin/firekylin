'use strict';
/**
 * model
 */
export default class extends think.model.relation {

  relation = {
    cate: {
      type: think.model.MANY_TO_MANY
    },
    tag: {
      type: think.model.MANY_TO_MANY
    }
  };
  /**
   * get post list
   * @param  {[type]} page  [description]
   * @param  {[type]} where [description]
   * @return {[type]}       [description]
   */
  async getPostList(page, where){
    let field = 'id,title,pathname,summary';
    let data = await this.field(field).where(where).countSelect();
    return data;
  }
}