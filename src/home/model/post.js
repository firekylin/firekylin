'use strict';
/**
 * model
 */
export default class extends think.model.relation {
  /**
   * relation
   * @type {Object}
   */
  relation = {
    cate: {
      type: think.model.MANY_TO_MANY,
      field: 'id,name'
    },
    tag: {
      type: think.model.MANY_TO_MANY,
      field: 'id,name'
    },
    user: {
      type: think.model.BELONG_TO,
      field: 'id,name,display_name'
    }
  };

  async init(...args) {
    super.init(...args);
    let {feedFullText, postsListSize} = await this.model('options').getOptions();
    this.feedFullText = feedFullText;
    this.postsListSize = +postsListSize;
  }
  /**
   * get where condition
   * @param  {[type]} where [description]
   * @return {[type]}       [description]
   */
  getWhereCondition(where){
    where = think.extend({}, where, {
      is_public: 1, //公开
      type: 0, //文章
      status: 3 //已经发布
    });
    if(!where.create_time){
      where.create_time = {
        '<=': think.datetime()
      };
    }
    return where;
  }
  /**
   * get post list
   * @param  {[type]} page  [description]
   * @param  {[type]} where [description]
   * @return {[type]}       [description]
   */
  async getPostList(page, options = {}){
    page = page | 0 || 1;

    let field = options.field || 'id,title,pathname,create_time,summary,comment_num';
    if( (await this.model('user').count()) > 1 ) { field += ',user_id'; }

    if(options.tag || options.cate){
      let name = options.tag ? 'tag' : 'cate';
      let {id} = await this.model(name).field('id').setRelation(false).where({name: options.tag || options.cate}).find();
      if(think.isEmpty(id)){
        return false;
      }
      let where = this.getWhereCondition({[`${name}.${name}_id`]: id});
      return this.join({
        table: `post_${name}`,
        as: name,
        on: ['id', 'post_id']
      }).where(where).order('create_time DESC').page(page, this.postsListSize).countSelect();
    }

    let where = this.getWhereCondition(options.where);
    // only cache first page post
    // if(page === 1){
    //   return think.cache('post_1', () => {
    //     return this.field(field).page(page, this.postsListSize).setRelation(false).order('create_time DESC').where(where).countSelect();
    //   },{timeout:259200});
    // }

    return this.field(field).page(page, this.postsListSize).setRelation('user').order('create_time DESC').where(where).countSelect();
  }

  /**
   * get post detail info
   * @param  {[type]} pathname [description]
   * @return {[type]}          [description]
   */
  async getPostDetail(pathname){
    let where = this.getWhereCondition({pathname});
    let detail = await this.where(where).fieldReverse('markdown_content,summary').find();
    if(think.isEmpty(detail)){
      return detail;
    }
    let createTime = think.datetime(detail.create_time);
    let prevWhere = this.getWhereCondition({
      create_time: ['<', createTime],
      id: ['!=', detail.id]
    });
    let prevPromise = this.field('title,pathname').setRelation(false).where(prevWhere).order('create_time DESC').find();
    let nextWhere = this.getWhereCondition({
      create_time: ['>', createTime],
      id: ['!=', detail.id]
    });
    let nextPromise = this.field('title,pathname').setRelation(false).where(nextWhere).order('create_time ASC').find();
    let [prev, next] = await Promise.all([prevPromise, nextPromise]);
    detail.prev = prev;
    detail.next = next;
    return detail;
  }
  async getPostRssList(){
    let field = 'id,title,pathname,create_time,';
    let where = this.getWhereCondition();

    if( this.feedFullText === '0' ) {
      field += 'summary,content';
    } else {
      field += 'content';
    }

    let data = await this.field(field).where(where).order('create_time DESC').setRelation(false).limit(10).select();
    return data;
  }

  async getPostSitemapList(){
    let field = 'pathname,type,update_time';
    let where = {
      is_public: 1, //公开
      status: 3, //已经发布
      create_time: {
        '<=': think.datetime()
      }
    }

    let data = await this.field(field).where(where).order('update_time DESC').setRelation(false).select();
    return data;
  }
  /**
   * get post archive
   * @return {[type]} [description]
   */
  async getPostArchive(){
    let where = this.getWhereCondition();
    let data = await this.field('id,title,pathname,create_time').order('create_time DESC').setRelation(false).where(where).select();
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
  /**
   * get post search result
   * @param  {[type]} keyword [description]
   * @param  {[type]} page    [description]
   * @return {[type]}         [description]
   */
  async getPostSearch(keyword, page){
    let where = {'title|content': ['LIKE', `%${keyword}%`]}
    where = this.getWhereCondition(where);
    return this.where(where).page(page, this.postsListSize).setRelation(false).field('title,pathname,summary,create_time').order('create_time DESC').countSelect(false);
  }
}
