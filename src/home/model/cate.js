module.exports = class extends think.Model {
  async getCateArchive() {
    const cates = {};
    const catesData = await this.select();

    for(const cate of catesData) {
      cate.posts = await this.model('post').getPostList(1, {cate: cate.pathname});
      cate.posts = cate.posts.data;

      cate.count = await this.model('post_cate').join({
        table: 'post',
        on: ['post_id', 'id']
      }).where({
        type: 0,
        status: 3,
        is_public: 1,
        cate_id: cate.id
      })
      .count();

      if(cate.pid) {
        continue;
      }
      cates[cate.id] = cate;
    }

    for(const cate of catesData) {
      if(!cate.pid) {
        continue;
      }
      const parentCate = cates[cate.pid];
      if(!parentCate.children) {
        parentCate.children = {};
      }
      parentCate.children[cate.id] = cate;
    }

    return Object.keys(cates).map(id => {
      const cate = cates[id];
      if(cate.children) {
        cate.children = Object.values(cate.children).sort((a, b)=> a.count>b.count ? -1 : 1);
      }
      return cate;
    }).sort((a, b)=> a.count>b.count ? -1 : 1);
  }
}
