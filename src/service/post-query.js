'use strict';

/**
 * Shared article query service. A fresh model is obtained for every query,
 * preventing query-builder state from leaking between requests.
 */
class PostQueryService {
  constructor({getModel, now}) {
    if (typeof getModel !== 'function' || typeof now !== 'function') {
      throw new TypeError('PostQueryService requires a model factory and clock');
    }
    this.getModel = getModel;
    this.now = now;
  }

  publicWhere(extra = {}) {
    return {
      type: 0,
      status: 3,
      is_public: 1,
      create_time: {'<=': this.now()},
      ...extra
    };
  }

  async listPublic({page = 1, limit = 10} = {}) {
    return this.getModel().where(this.publicWhere())
      .field('id,title,pathname,summary,create_time,update_time')
      .setRelation(false)
.order('create_time DESC')
.page(page, limit)
.select();
  }

  async getPublic(id) {
    return this.getModel().where(this.publicWhere({id}))
      .field('id,title,pathname,summary,markdown_content,create_time,update_time')
      .setRelation(false)
.find();
  }

  async searchPublic({query, limit = 10}) {
    return this.getModel().where(this.publicWhere({
      'title|content': ['LIKE', '%' + query + '%']
    })).field('id,title,pathname,summary,create_time,update_time')
      .setRelation(false)
.order('create_time DESC')
.limit(limit)
.select();
  }

  async getAdmin(id, userInfo) {
    const where = {type: 0, id};
    if (userInfo.type !== 1) where.user_id = userInfo.id;
    return this.getModel().where(where).find();
  }

  async listAdmin({userInfo, status, keyword, cate, page, pageSize = 15} = {}) {
    const model = this.getModel();
    const where = {type: 0};
    if (userInfo.type !== 1) where.user_id = userInfo.id;
    if (status) where.status = status;
    else where.status = ['!=', 4];

    if (keyword) {
      let keywords = keyword.split(/\s+/g);
      if (keywords.includes(':public') || keywords.includes(':private')) {
        where.is_public = Number(keywords.includes(':public'));
        keywords = keywords.filter(word => word !== ':public' && word !== ':private');
      }
      if (keywords.length > 0) where.title = ['like', keywords.map(word => '%' + word + '%')];
    }

    if (cate) {
      const cateId = parseInt(cate, 10);
      if (!isNaN(cateId)) {
        model.join({table: 'post_cate', join: 'left', on: ['id', 'post_id']});
        where.cate_id = cateId;
      }
    }

    const fields = [
      model.config.prefix + 'post.id',
      'title', 'user_id', 'create_time', 'update_time',
      'status', 'pathname', 'is_public'
    ];
    return model.where(where).field(fields)
      .order('create_time DESC')
.page(page, pageSize)
.countSelect();
  }
}

module.exports = PostQueryService;
