import Base from './base';

const GHOST_POST_STATUS = {
  published: 3, //发布
  draft: 0 //草稿
};

export default class extends Base {
  /**
   * 导入用户
   */
  async user({users}) {
    if( !users || !Array.isArray(users) ) {
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
  async post({posts, users, post_tags}) {
    if(!Array.isArray(posts) || !Array.isArray(users)) {
      return 0;
    }

    if(!Array.isArray(post_tags)) {
      post_tags = [];
    }

    posts = posts.filter(item => item.page === 0);
    const postsPromise = posts.map(async item => {
      try{
        //获取用户和标签
        const userSlug = users.filter(user => user.id === item.author_id)[0].slug;
        const user = await this.userModelInstance.where({ name: userSlug }).find();
        const retTag = post_tags.filter(tag => tag.post_id === item.id).map(tag => tag.tag_id);

        const post = {
          title: item.title,
          pathname: item.slug,
          content: item.html,
          summary: item.html,
          create_time: this.formatDate(new Date(item.created_at)),
          update_time: this.formatDate(new Date(item.updated_at)),
          status: GHOST_POST_STATUS[item.status] || 0,
          user_id: user.id,
          comment_num: 0,
          allow_comment: 1,
          is_public: Number(item.visibility === 'public'),
          tag: retTag
        };
        post.markdown_content = this.toMarkdown(post.content);
        await this.postModelInstance.addPost(post);
      } catch(e) { console.log(e)}
    });
    Promise.all(postsPromise);
    
    return posts.length;
  }

  /**
   * 导入页面
   */
  async page({posts}) {
    if(!Array.isArray(posts)) {
      return 0;
    }

    const pages = posts.filter(item => item.page === 1);
    const pagesPromise = pages.map(async item => {
      const userSlug = authors.filter(author => author.id === item.author_id)[0].slug;
      const user = await this.userModelInstance.where({ name: userSlug }).find();

      const page = {
        title: item.title,
        pathname: item.slug,
        content: item.html,
        summary: item.html,
        create_time: this.formatDate(new Date(item.created_at)),
        update_time: this.formatDate(new Date(item.updated_at)),
        status: GHOST_POST_STATUS[item.status] || 0,
        user_id: user.id,
        comment_num: 0,
        allow_comment: 1,
        is_public: Number(item.visibility === 'public')
      };
      page.markdown_content = this.toMarkdown(page.content);
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
      const jsonObj = think.safeRequire(file.path);
      return jsonObj.db[0].data
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
