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
   * get where condition
   * @param  {[type]} where [description]
   * @return {[type]}       [description]
   */
  getWhereCondition(where){
    return think.extend({}, where, {
      create_time: {'<=': think.datetime()},
      is_public: 1, //公开
      type: 0, //文章
      status: 3 //已经发布
    })
  }
  /**
   * get post list
   * @param  {[type]} page  [description]
   * @param  {[type]} where [description]
   * @return {[type]}       [description]
   */
  async getPostList(page, where){
    let field = 'id,title,pathname,summary';
    where = this.getWhereCondition(where);

    let data = await this.field(field).page(page).where(where).countSelect();
    return data;
  }

  async getPostRssList(){
    let field = 'id,title,pathname,content';
    let where = this.getWhereCondition();

    let data = await this.field(field).where(where).setRelation(false).limit(10).select();
    return data;
  }
  /**
   * get post archive
   * @return {[type]} [description]
   */
  async getPostArchive(){
    let where = this.getWhereCondition();
    let data = await this.field('id,title,pathname,create_time').setRelation('tag').where(where).select();
    let result = {};
    data.forEach(item => {
      let yearMonth = think.datetime(item.create_time, 'YYYY年MM月');
      if(!(yearMonth in result)){
        result[yearMonth] = [];
      }
      result[yearMonth].push(item);
    });
    return result;
  }
}