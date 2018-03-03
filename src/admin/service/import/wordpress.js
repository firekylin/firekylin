const fs = require('fs');
const xml2js = require('xml2js');
const Base = require('./base');

const WP_POST_STATUS = {
  publish: 3, //发布
  future: 3, //未来发布
  draft: 0, //草稿
  pending: 1, //待审核
  private: 3, //私密文章对应 is_public 字段为 false, 发布状态为已发布
  trash: 2, //删除文章没有对应关系遂转为已拒绝文章
};

module.exports = class extends Base {

  formatArray(obj) {
    for(var i in obj) {
      if(Array.isArray(obj[i]) && obj[i].length === 1) {
        obj[i] = obj[i][0];
      } else if(typeof(obj[i]) === 'object') {
        obj[i] = this.formatArray(obj[i]);
      }
    }
    return obj;
  }

  /**
   * 导入用户
   */
  async user(channel) {
    /** 无用户无需导入返回导入0个用户 */
    if(!channel.hasOwnProperty('wp:author')) {
      return 0;
    }

    let authors = channel['wp:author'];

    let authorsPromise = authors.map(author => this.userModelInstance.addUser({
      username: author['wp:author_login'][0],
      email: author['wp:author_email'][0],
      display_name: author['wp:author_display_name'][0],
      password: Base.DEFAULT_USER_PWD,
      type: 2, //默认导入用户都为编辑
      status: 2, //默认导入用户都处于禁用状态
    }, '127.0.0.1'));
    await Promise.all(authorsPromise);

    return authors.length; //返回最终导入用户的数量
  }

  /**
   * 导入文章
   */
  async post(channel) {
    if(!Array.isArray(channel.item)) {
      return 0;
    }

    let posts = channel.item.filter(item => {
      let keys = [
        'wp:post_type',
        'dc:creator',
        'content:encoded',
        'wp:post_name',
        'wp:post_date',
        'wp:status',
        'wp:comment_status'
      ];

      for(let key of keys) {
        if(!Array.isArray(item[key]) || !item[key].length) {
          return false;
        }
      }
      return item['wp:post_type'][0] ==='post';
    });

    let postsPromise = posts.map(async item => {
      try{
        //获取用户
        let user = await this.userModelInstance.where({name: item['dc:creator'][0]}).find();
        //查询分类 ID
        let cate = [];
        if(item.hasOwnProperty('category')) {
          let cates = item.category.filter(item => item.$.domain === 'category').map(item => item._);
          if(Array.isArray(cates) && cates.length > 0) {
            cate = await this.cateModelInstance.setRelation(false)
              .field('id')
              .where({name: ['IN', cates]})
              .select();
            cate = cate.map(item => item.id);
          }
        }

        //摘要有可能是空
        let summary;
        if(item.hasOwnProperty('excerpt:encoded') && item['excerpt:encoded'][0] !== '') {
          summary = item['excerpt:encoded'][0];
        } else {
          summary = item['content:encoded'][0];
        }

        let post = {
          title: item.title[0],
          pathname: decodeURIComponent(item['wp:post_name'][0]),
          content: item['content:encoded'][0],
          summary,
          create_time: this.formatDate(new Date(item.pubDate[0])),
          update_time: item['wp:post_date'][0],
          status: WP_POST_STATUS[ item['wp:status'][0] ] || 0,
          user_id: user.id,
          comment_num: 0,
          allow_comment: Number(item['wp:comment_status'][0] === 'open'),
          is_public: Number(item['wp:status'][0] !== 'private'),
          tag: item.hasOwnProperty('category') ?
            item.category.filter(item => item.$.domain === 'post_tag').map(item => item._) : [],
          cate
        };

        post.markdown_content = this.toMarkdown(post.content);
        await this.postModelInstance.addPost(post);
      } catch(e) {
        console.log(e); // eslint-disable-line no-console
      }
    });
    await Promise.all(postsPromise);

    return posts.length;
  }

  /**
   * 导入页面
   */
  async page(channel) {
    if(!Array.isArray(channel.item)) {
      return 0;
    }

    let pages = channel.item.filter(item => {
      let keys = [
        'wp:post_type',
        'dc:creator',
        'excerpt:encoded',
        'content:encoded',
        'wp:post_name',
        'wp:status',
        'wp:comment_status',
      ];
      for(let key of keys) {
        if(!Array.isArray(item[key]) || !item[key].length) {
          return false;
        }
      }
      return item['wp:post_type'][0] === 'page';
    });

    let pagesPromise = pages.map(async item => {
      let user = await this.userModelInstance.where({name: item['dc:creator'][0]}).find();
      let summary = item['excerpt:encoded'][0];
      if(summary === '') {
        summary = item['content:encoded'][0];
      }

      let page = {
        title: item.title[0],
        pathname: decodeURIComponent(item['wp:post_name'][0]),
        content: item['content:encoded'][0],
        summary,
        create_time: this.formatDate(new Date(item.pubDate[0])),
        update_time: item['wp:post_date'][0],
        status: WP_POST_STATUS[ item['wp:status'][0] ] || 0,
        user_id: user.id,
        comment_num: 0,
        allow_comment: item['wp:comment_status'][0] === 'open',
        is_public: item['wp:status'][0] !== 'private',
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
  async tag(channel) {
    if(!Array.isArray(channel['wp:tag'])) {
      return 0;
    }

    let tags = channel['wp:tag'];
    let tagsPromise = [];
    for(let tag of tags) {
      let tagName = tag['wp:tag_name'], tagSlug = tag['wp:tag_slug'];
      if(!Array.isArray(tagName) || !tagName.length) {
        continue;
      }
      if(!Array.isArray(tagSlug) || !tagName.length) {
        continue;
      }

      tagsPromise.push(this.tagModelInstance.addTag({
        name: tagName[0],
        pathname: decodeURIComponent(tagSlug[0])
      }));
    }

    await Promise.all(tagsPromise);
    return tags.length;
  }

  /**
   * 导入分类
   * 为了简单不支持子分类导入，默认所有分类为一级分类
   */
  async category(channel) {
    if(!Array.isArray(channel['wp:category'])) {
      return 0;
    }

    let categories = channel['wp:category'];
    let categoriesPromise = [];
    for(let cate of categories) {
      let cateName = cate['wp:cat_name'], cateSlug = cate['wp:category_nicename'];
      if(!Array.isArray(cateName) || !cateName.length) {
        continue;
      }
      if(!Array.isArray(cateSlug) || !cateSlug.length) {
        continue;
      }

      categoriesPromise.push(this.cateModelInstance.addCate({
        name: cateName[0],
        pathname: decodeURIComponent(cateSlug[0]),
        pid: 0
      }));
    }

    await Promise.all(categoriesPromise);
    return categories.length;
  }

  /**
   * 处理上传文件获取导入数据
   */
  async parseFile(file) {
    let data = fs.readFileSync(file.path, {encoding: 'utf-8'});

    let parser = new xml2js.Parser();
    let parseString = think.promisify(parser.parseString, parser);
    let wxrJSON = await parseString(data);

    return this.formatArray(wxrJSON).rss.channel;
  }

  /**
   * 执行导入
   */
  async run(file) {
    let channel = await this.parseFile(file);
    return await this.importData(channel);
  }
}
