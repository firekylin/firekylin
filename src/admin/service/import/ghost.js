const Base = require('./base');

const GHOST_POST_STATUS = {
  published: 3, //发布
  draft: 0 //草稿
};

module.exports = class extends Base {
  /**
   * 导入用户
   */
  async user({users}) {
    if(!users || !Array.isArray(users)) {
      return 0;
    }

    const usersPromise = users.map(user => this.userModelInstance.addUser({
      username: user.slug,
      email: user.email,
      display_name: user.name,
      password: Base.DEFAULT_USER_PWD,
      type: 2, //默认导入用户都为编辑
      status: 2, //默认导入用户都处于禁用状态
    }, '127.0.0.1'));
    await Promise.all(usersPromise);

    return users.length;
  }

  /**
   * 导入文章
   */
  async post({
    posts,
    users,
    tags,
    categories,
    post_tags,
    posts_tags,
    post_categories,
    posts_categories
  }) {
    if(!Array.isArray(posts) || !Array.isArray(users)) {
      return 0;
    }

    post_tags = post_tags || posts_tags;
    post_categories = post_categories || posts_categories;
    if(!Array.isArray(post_tags)) {
      post_tags = [];
    }
    if(!Array.isArray(post_categories)) {
      post_categories = [];
    }
    if(!Array.isArray(tags)) {
      tags = [];
    }
    if(!Array.isArray(categories)) {
      categories = [];
    }

    posts = posts.filter(item => item.page === 0);
    const postsPromise = posts.map(async item => {
      try{
        //获取用户
        const userSlug = users.filter(user => user.id === item.author_id)[0].slug;
        const user = await this.userModelInstance.where({ name: userSlug }).find();

        //获取标签
        let tag = [];
        let retTag = post_tags.filter(tag => tag.post_id === item.id).map(tag => tag.tag_id);
        retTag = tags.filter(({id}) => retTag.includes(id)).map(({name}) => name);
        if(retTag.length) {
          tag = await this.tagModelInstance.setRelation(false).where({name: ['IN', retTag]}).select();
          tag = tag.map(item => item.id);
        }

        //获取分类
        let cate = [];
        let retCategory = post_categories.filter(({post_id}) => post_id === item.id)
          .map(({category_id}) => category_id);
        retCategory = categories.filter(({id}) => retCategory.includes(id)).map(({name}) => name);
        if(retCategory.length) {
          cate = await this.cateModelInstance.setRelation(false).where({name: ['IN', retCategory]}).select();
          cate = cate.map(item => item.id);
        }

        const post = {
          title: item.title,
          pathname: item.slug,
          content: item.html,
          summary: item.html,
          markdown_content: item.hasOwnProperty('markdown') ? item.markdown : this.toMarkdown(item.html),
          create_time: this.formatDate(new Date(item.created_at)),
          update_time: this.formatDate(new Date(item.updated_at)),
          status: GHOST_POST_STATUS[item.status] || 0,
          user_id: user.id,
          comment_num: 0,
          allow_comment: item.hasOwnProperty('allow_comment') ? item.allow_comment : 1,
          is_public: item.hasOwnProperty('visibility') ? Number(item.visibility === 'public') : 1,
          tag,
          cate
        };
        await this.postModelInstance.addPost(post);
      } catch(e) {
        console.log(e); // eslint-disable-line no-console
      }
    });
    Promise.all(postsPromise);

    return posts.length;
  }

  /**
   * 导入页面
   */
  async page({
    posts,
    users
  }) {
    if(!Array.isArray(posts)) {
      return 0;
    }

    const pages = posts.filter(item => item.page === 1 && item.title);
    const pagesPromise = pages.map(async item => {
      const userSlug = users.filter(user => user.id === item.author_id)[0].slug;
      const user = await this.userModelInstance.where({ name: userSlug }).find();

      const page = {
        title: item.title,
        pathname: item.slug,
        content: item.html,
        summary: item.html,
        markdown_content: item.hasOwnProperty('markdown') ? item.markdown : this.toMarkdown(item.html),
        create_time: this.formatDate(new Date(item.created_at)),
        update_time: this.formatDate(new Date(item.updated_at)),
        status: GHOST_POST_STATUS[item.status] || 0,
        user_id: user.id,
        comment_num: 0,
        allow_comment: item.hasOwnProperty('allow_comment') ? item.allow_comment : 1,
        is_public: item.hasOwnProperty('visibility') ? Number(item.visibility === 'public') : 1,
      };
      await this.pageModelInstance.addPost(page);
    });
    Promise.all(pagesPromise);

    return pages.length;
  }

  /**
   * 导入标签
   */
  async tag({tags}) {
    if(!tags || !Array.isArray(tags)) {
      return 0;
    }

    const tagsPromise = tags.map(tag => this.tagModelInstance.addTag({
      name: tag.name,
      pathname: tag.slug
    }));
    await Promise.all(tagsPromise);

    return tags.length;
  }

  /**
   * 导入分类
   */
  async category() {
    return 0;
  }

  /**
   * 处理上传文件获取导入数据
   */
  parseFile(file) {
    try {
      let jsonObj = think.safeRequire(file.path);
      if(Array.isArray(jsonObj.db) && jsonObj.db.length) {
        jsonObj = jsonObj.db[0];
      }
      return jsonObj.data;
    } catch(e) {
      throw Error('INVALID_FILE');
    }
  }

  /**
   * 执行导入
   */
  async run(file) {
    return await this.importData(this.parseFile(file));
  }
}
