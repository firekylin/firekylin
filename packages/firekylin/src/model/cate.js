const Base = require('./base');

module.exports = class extends Base {
  get relation() {
    return {
      post_cate: {
        type: think.Model.HAS_MANY,
        fKey: 'cate_id'
      }
    };
  }

  /**
   * 添加分类
   * @param {[type]} data [description]
   * @param {[type]} ip   [description]
   */
  addCate(data) {
    const where = {
      name: data.name,
      _logic: 'OR'
    };
    if (data.pathname) {
      where.pathname = data.pathname;
    }
    return this.where(where).thenAdd(data);
  }

  async saveCate(data) {
    const info = await this.where({id: data.id}).find();
    if (think.isEmpty(info)) {
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
    if (userId) {
      return this.where({user_id: userId}).count();
    }
    return this.count();
  }

  async getPostsListSize() {
    const { postsListSize } = await this.model('options').getOptions();
    return +postsListSize;
  }

  async getCateArchive() {
    const cates = {};
    const catesData = await this.select();

    if (think.isEmpty(catesData)) {
      return [];
    }

    const catesId = catesData.map(({ id }) => id);
    catesData.forEach(cate => {
      cates[cate.id] = cate;
    });

    // 获取所有的文章 ID 并对其进行分类
    const postsId = await this.model('post_cate').join({
      table: 'post',
      on: ['post_id', 'id']
    }).where({
      type: 0,
      status: 3,
      is_public: 1,
      cate_id: ['IN', catesId]
    })
      .select();

    const catePosts = {};
    postsId.forEach(({ post_id, cate_id }) => {
      if (!think.isArray(catePosts[cate_id])) {
        catePosts[cate_id] = [];
      }

      catePosts[cate_id].push(post_id);
    });

    // 规整获取需要获取的文章 ID
    const pageSize = await this.getPostsListSize();
    const postIds = [];
    for (const cate_id in catePosts) {
      catePosts[cate_id] = [...new Set(catePosts[cate_id])];
      postIds.push(...catePosts[cate_id].slice(0, pageSize));
    }

    // 根据 ID 获取所有的文章数据，并创建哈希表
    const posts = {};
    if (postIds.length) {
      const { data: postsArr } = await this.model('post').getPostList(1, {
        where: {
          id: ['IN', postIds]
        }
      });
      postsArr.forEach(post => {
        posts[post.id] = post;
      });
    }

    // 根据分类归类文章
    for (const cate of catesData) {
      if (!think.isArray(catePosts[cate.id])) {
        cate.posts = [];
        cate.count = 0;
      } else {
        cate.posts = catePosts[cate.id].slice(0, pageSize).map(
          post_id => posts[post_id]
        );
        cate.count = catePosts[cate.id].length;
      }

      if (!cate.pid) {
        continue;
      }

      const parentCate = cates[cate.pid];
      if (!parentCate.children) {
        parentCate.children = {};
      }
      parentCate.children[cate.id] = cate;
    }

    // 对分类根据文章数进行排序返回
    return Object.keys(cates)
      .filter(id => !cates[id].pid)
      .map(id => {
        const cate = cates[id];
        cate.pathname = encodeURIComponent(cate.pathname);
        if (cate.children) {
          cate.children = Object.values(cate.children).sort((a, b) => a.count > b.count ? -1 : 1);
          cate.children.forEach(c => {
            c.pathname = encodeURIComponent(c.pathname);
          });
        }
        return cate;
      })
      .sort((a, b) => a.count > b.count ? -1 : 1);
  }

  async getCateList() {
    const catesData = await this.select();
    if (think.isEmpty(catesData)) {
      return [];
    }

    const cates = {};
    catesData.forEach(cate => {
      cate.count = 0;
      cates[cate.id] = cate;
    });

    const counts = await this.model('post_cate').join({
      table: 'post',
      on: ['post_id', 'id']
    }).where({
      type: 0,
      status: 3,
      is_public: 1,
      cate_id: ['IN', catesData.map(cate => cate.id)]
    })
      .field('cate_id,post_id')
      .select();

    const postIds = {};
    counts.forEach(({cate_id, post_id}) => {
      if (!postIds[cate_id]) postIds[cate_id] = new Set();
      postIds[cate_id].add(post_id);
    });
    Object.keys(postIds).forEach(id => {
      cates[id].count = postIds[id].size;
    });

    catesData.forEach(cate => {
      cate.pathname = encodeURIComponent(cate.pathname);
      if (cate.pid && cates[cate.pid]) {
        if (!cates[cate.pid].children) cates[cate.pid].children = [];
        cates[cate.pid].children.push(cate);
      }
    });

    const byCount = (left, right) => right.count - left.count;
    catesData.forEach(cate => {
      if (cate.children) cate.children.sort(byCount);
    });
    return catesData.filter(cate => !cate.pid).sort(byCount);
  }
};
