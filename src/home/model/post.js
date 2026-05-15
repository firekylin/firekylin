module.exports = class extends think.Model {
  get relation() {
    return {
      cate: {
        type: think.Model.MANY_TO_MANY,
        field: 'id,name,pathname'
      },
      tag: {
        type: think.Model.MANY_TO_MANY,
        field: 'id,name,pathname'
      },
      user: {
        type: think.Model.BELONG_TO,
        field: 'id,name,display_name,email'
      }
    };
  }

  async getFeedFullText() {
    const {feedFullText} = await this.model('options').getOptions();
    return feedFullText;
  }

  async getPostsListSize() {
    const {postsListSize} = await this.model('options').getOptions();
    return +postsListSize;
  }

  /**
   * get where condition
   * @param  {[type]} where [description]
   * @return {[type]}       [description]
   */
  getWhereCondition(where) {
    where = think.extend({}, where, {
      is_public: 1, // 公开
      type: 0, // 文章
      status: 3 // 已经发布
    });
    if (!where.create_time) {
      where.create_time = {
        '<=': think.datetime()
      };
    }
    return where;
  }

  /**
   * 获取最近的10条数据 - 有缓存
   *
   * @return {Promise}
   */
  getLastPostList() {
    return think.cache('lastPostList', async() => {
      const postList = await this.getPostList();
      return postList.data;
    });
  }

  /**
   * get post list
   * @param  {[type]} page  [description]
   * @param  {[type]} where [description]
   * @return {[type]}       [description]
   */
  async getPostList(page, options = {}) {
    page = page | 0 || 1;
    const postsListSize = await this.getPostsListSize();

    let field = options.field || 'id,title,pathname,create_time,summary,comment_num,options';
    if ((await this.model('user').count()) > 0) { field += ',user_id' }

    if (options.tag || options.cate) {
      const name = options.tag ? 'tag' : 'cate';
      const {id} = await this.model(name)
        .field('id')
        .setRelation(false)
        .where({pathname: options.tag || options.cate})
        .find();
      if (think.isEmpty(id)) {
        return false;
      }
      const where = this.getWhereCondition({[`${name}.${name}_id`]: id});
      return this
        .join({
          table: `post_${name}`,
          as: name,
          on: ['id', 'post_id']
        })
        .where(where)
        .order('create_time DESC')
        .page(page, postsListSize)
        .countSelect();
    }

    const where = this.getWhereCondition(options.where);
    // only cache first page post
    // if(page === 1){
    //   return think.cache('post_1', () => {
    //     return this.field(field)
    //       .page(page, postsListSize)
    //       .setRelation(false)
    //       .order('create_time DESC')
    //       .where(where)
    //       .countSelect();
    //   },{timeout:259200});
    // }

    return this.field(field)
      .page(page, postsListSize)
      .setRelation('user')
      .order('create_time DESC')
      .where(where)
      .countSelect();
  }

  /**
   * get post detail info
   * @param  {[type]} pathname [description]
   * @return {[type]}          [description]
   */
  async getPostDetail(pathname) {
    const where = this.getWhereCondition({pathname});
    const detail = await this.where(where).fieldReverse('markdown_content,summary').find();
    if (think.isEmpty(detail)) {
      return detail;
    }
    const createTime = think.datetime(detail.create_time);
    const prevWhere = this.getWhereCondition({
      create_time: ['<', createTime],
      id: ['!=', detail.id]
    });
    const prevPromise = this.field('title,pathname')
      .setRelation(false)
      .where(prevWhere)
      .order('create_time DESC')
      .find();
    const nextWhere = this.getWhereCondition({
      create_time: ['>', createTime],
      id: ['!=', detail.id]
    });
    const nextPromise = this.field('title,pathname')
      .setRelation(false)
      .where(nextWhere)
      .order('create_time ASC')
      .find();
    const [prev, next] = await Promise.all([prevPromise, nextPromise]);
    detail.prev = prev;
    detail.next = next;
    return detail;
  }
  async getPostRssList() {
    let field = 'id,title,pathname,create_time,';
    const where = this.getWhereCondition();
    const feedFullText = await this.getFeedFullText();

    if (feedFullText === '0') {
      field += 'summary,content';
    } else {
      field += 'content';
    }

    const data = await this.field(field)
      .where(where)
      .order('create_time DESC')
      .setRelation(false)
      .limit(10)
      .select();
    return data;
  }

  async getPostSitemapList() {
    const field = 'pathname,type,update_time';
    const where = {
      is_public: 1, // 公开
      status: 3, // 已经发布
      create_time: {
        '<=': think.datetime()
      }
    };

    const data = await this.field(field)
      .where(where)
      .order('update_time DESC')
      .setRelation(false)
      .select();
    return data;
  }
  /**
   * get post archive
   * @return {[type]} [description]
   */
  async getPostArchive() {
    const where = this.getWhereCondition();
    const data = await this.field('id,title,pathname,create_time')
      .order('create_time DESC')
      .setRelation(false)
      .where(where)
      .select();
    const result = {};
    data.forEach(item => {
      const yearMonth = think.datetime(item.create_time, 'YYYY年MM月');
      if (!(yearMonth in result)) {
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
  async getPostSearch(keyword, page) {
    let where = {'title|content': ['LIKE', `%${keyword}%`]};
    where = this.getWhereCondition(where);
    return this.where(where)
      .page(page, await this.getPostsListSize())
      .setRelation(false)
      .field('title,pathname,summary,create_time')
      .order('create_time DESC')
      .countSelect(false);
  }
};
