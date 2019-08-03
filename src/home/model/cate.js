module.exports = class extends think.Model {
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
    catesData.forEach(cate => cates[cate.id] = cate);

    //获取所有的文章 ID 并对其进行分类
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

    //规整获取需要获取的文章 ID
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
      postsArr.forEach(post => posts[post.id] = post);
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

    //对分类根据文章数进行排序返回
    return Object.keys(cates)
      .filter(id => !cates[id].pid)
      .map(id => {
        const cate = cates[id];
        if (cate.children) {
          cate.children = Object.values(cate.children).sort((a, b) => a.count > b.count ? -1 : 1);
        }
        return cate;
      })
      .sort((a, b) => a.count > b.count ? -1 : 1);
  }
}
