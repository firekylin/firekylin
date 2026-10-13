const fs = require('fs');
const xml2js = require('xml2js');
const Base = require('./base');

const WP_POST_STATUS = {
  publish: 3, // 发布
  future: 3, // 未来发布
  draft: 0, // 草稿
  pending: 1, // 待审核
  private: 3, // 私密文章对应 is_public 字段为 false, 发布状态为已发布
  trash: 2 // 删除文章没有对应关系遂转为已拒绝文章
};

const WP_COMMENT_STATUS = {
  1: 'approved',
  approve: 'approved',
  approved: 'approved',
  spam: 'spam',
  trash: 'spam'
};

function value(input, fallback = '') {
  if (Array.isArray(input)) return input.length ? input[0] : fallback;
  return typeof input === 'undefined' || input === null ? fallback : input;
}

function commentStatus(status) {
  return WP_COMMENT_STATUS[String(value(status)).toLowerCase()] || 'waiting';
}

module.exports = class extends Base {
  formatArray(obj) {
    for (var i in obj) {
      if (Array.isArray(obj[i]) && obj[i].length === 1) {
        obj[i] = obj[i][0];
      } else if (typeof (obj[i]) === 'object') {
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
    if (!Object.hasOwn(channel, 'wp:author')) {
      return 0;
    }

    const authors = channel['wp:author'];

    const authorsPromise = authors.map(author => this.userModelInstance.addUser({
      username: author['wp:author_login'][0],
      email: author['wp:author_email'][0],
      display_name: author['wp:author_display_name'][0],
      password: Base.DEFAULT_USER_PWD,
      type: 2, // 默认导入用户都为编辑
      status: 2 // 默认导入用户都处于禁用状态
    }, '127.0.0.1'));
    await Promise.all(authorsPromise);

    return authors.length; // 返回最终导入用户的数量
  }

  /**
   * 导入文章
   */
  async post(channel) {
    if (!Array.isArray(channel.item)) {
      return 0;
    }

    const posts = channel.item.filter(item => {
      const keys = [
        'wp:post_type',
        'dc:creator',
        'content:encoded',
        'wp:post_name',
        'wp:post_date',
        'wp:status',
        'wp:comment_status'
      ];

      for (const key of keys) {
        if (!Array.isArray(item[key]) || !item[key].length) {
          return false;
        }
      }
      return item['wp:post_type'][0] === 'post';
    });

    const postsPromise = posts.map(async item => {
      try {
        // 获取用户
        const user = await this.userModelInstance.where({name: item['dc:creator'][0]}).find();
        // 查询分类 ID
        let cate = [];
        if (Object.hasOwn(item, 'category')) {
          const cates = item.category.filter(item => item.$.domain === 'category').map(item => item._);
          if (Array.isArray(cates) && cates.length > 0) {
            cate = await this.cateModelInstance.setRelation(false)
              .field('id')
              .where({name: ['IN', cates]})
              .select();
            cate = cate.map(item => item.id);
          }
        }

        // 摘要有可能是空
        let summary;
        if (Object.hasOwn(item, 'excerpt:encoded') && item['excerpt:encoded'][0] !== '') {
          summary = item['excerpt:encoded'][0];
        } else {
          summary = item['content:encoded'][0];
        }

        const post = {
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
          tag: Object.hasOwn(item, 'category')
            ? item.category.filter(item => item.$.domain === 'post_tag').map(item => item._) : [],
          cate
        };

        post.markdown_content = this.toMarkdown(post.content);
        await this.postModelInstance.addPost(post);
      } catch (e) {
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
    if (!Array.isArray(channel.item)) {
      return 0;
    }

    const pages = channel.item.filter(item => {
      const keys = [
        'wp:post_type',
        'dc:creator',
        'excerpt:encoded',
        'content:encoded',
        'wp:post_name',
        'wp:status',
        'wp:comment_status'
      ];
      for (const key of keys) {
        if (!Array.isArray(item[key]) || !item[key].length) {
          return false;
        }
      }
      return item['wp:post_type'][0] === 'page';
    });

    const pagesPromise = pages.map(async item => {
      const user = await this.userModelInstance.where({name: item['dc:creator'][0]}).find();
      let summary = item['excerpt:encoded'][0];
      if (summary === '') {
        summary = item['content:encoded'][0];
      }

      const page = {
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
        is_public: item['wp:status'][0] !== 'private'
      };
      page.markdown_content = this.toMarkdown(page.content);
      await this.pageModelInstance.addPost(page);
    });
    Promise.all(pagesPromise);

    return pages.length;
  }

  /**
   * 导入 WordPress 评论，并把 WXR 中的父子关系转换为当前评论 ID。
   */
  async comment(channel) {
    if (!Array.isArray(channel.item)) return 0;

    const source = [];
    channel.item.forEach(item => {
      const type = String(value(item['wp:post_type']));
      if (!['post', 'page'].includes(type)) return;
      const pathname = decodeURIComponent(String(value(item['wp:post_name'])));
      const comments = Array.isArray(item['wp:comment']) ? item['wp:comment'] : [];
      comments.forEach((comment, index) => {
        source.push({
          comment,
          key: String(value(comment['wp:comment_id'], `${type}:${pathname}:${index}`)),
          parentKey: String(value(comment['wp:comment_parent'], '0')),
          pathname,
          type: type === 'page' ? 1 : 0
        });
      });
    });
    if (!source.length) return 0;

    const posts = await this.postModelInstance.setRelation(false).field('id,type,pathname').where({
      pathname: ['IN', [...new Set(source.map(item => item.pathname))]]
    })
      .select();
    const postMap = new Map(posts.map(post => [`${Number(post.type)}:${post.pathname}`, post]));
    const sourceMap = new Map(source.map(item => [item.key, item]));
    const depth = (item, seen = new Set()) => {
      if (!item.parentKey || item.parentKey === '0' || seen.has(item.key)) return 0;
      const parent = sourceMap.get(item.parentKey);
      if (!parent) return 0;
      return 1 + depth(parent, new Set([...seen, item.key]));
    };
    source.sort((left, right) => depth(left) - depth(right));

    const commentModel = this.model('comment');
    const idMap = new Map();
    const rootMap = new Map();
    const affectedPosts = new Set();
    let imported = 0;
    for (const item of source) {
      const post = postMap.get(`${item.type}:${item.pathname}`);
      if (!post) continue;
      const data = item.comment;
      const parentId = idMap.get(item.parentKey);
      const rootId = rootMap.get(item.parentKey) || parentId;
      const date = String(value(data['wp:comment_date']) || value(data['wp:comment_date_gmt']) || think.datetime())
        .replace('T', ' ').replace(/Z$/, '');
      const email = String(value(data['wp:comment_author_email']));
      const wordpressUserId = Number(value(data['wp:comment_user_id'], 0));
      let userId = null;
      if (wordpressUserId && email) {
        const user = await this.userModelInstance.where({email}).field('id').find();
        if (user && user.id) userId = String(user.id);
      }
      const url = `/${item.type === 1 ? 'page' : 'post'}/${post.pathname}.html`;
      const savedId = await commentModel.add({
        comment: String(value(data['wp:comment_content'])),
        url,
        post_id: post.id,
        mail: email || null,
        nick: String(value(data['wp:comment_author'])) || null,
        link: String(value(data['wp:comment_author_url'])) || null,
        pid: parentId ? String(parentId) : null,
        rid: rootId ? String(rootId) : null,
        ua: String(value(data['wp:comment_author_user_agent'])) || null,
        ip: String(value(data['wp:comment_author_IP'])) || null,
        user_id: userId,
        status: commentStatus(data['wp:comment_approved']),
        sticky: 0,
        like: 0,
        inserted_at: date,
        created_at: date,
        updated_at: date
      });
      idMap.set(item.key, savedId);
      rootMap.set(item.key, rootId || savedId);
      affectedPosts.add(Number(post.id));
      imported++;
    }

    for (const postId of affectedPosts) {
      const count = await commentModel.where({post_id: postId, status: ['NOT IN', ['waiting', 'spam']]}).count();
      await this.postModelInstance.where({id: postId}).update({comment_num: Number(count)});
    }
    return imported;
  }

  /**
   * 导入标签
   */
  async tag(channel) {
    if (!Array.isArray(channel['wp:tag'])) {
      return 0;
    }

    const tags = channel['wp:tag'];
    const tagsPromise = [];
    for (const tag of tags) {
      const tagName = tag['wp:tag_name']; const tagSlug = tag['wp:tag_slug'];
      if (!Array.isArray(tagName) || !tagName.length) {
        continue;
      }
      if (!Array.isArray(tagSlug) || !tagName.length) {
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
    if (!Array.isArray(channel['wp:category'])) {
      return 0;
    }

    const categories = channel['wp:category'];
    const categoriesPromise = [];
    for (const cate of categories) {
      const cateName = cate['wp:cat_name']; const cateSlug = cate['wp:category_nicename'];
      if (!Array.isArray(cateName) || !cateName.length) {
        continue;
      }
      if (!Array.isArray(cateSlug) || !cateSlug.length) {
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
    const data = fs.readFileSync(file.path, {encoding: 'utf-8'});

    const parser = new xml2js.Parser();
    const parseString = think.promisify(parser.parseString, parser);
    const wxrJSON = await parseString(data);

    return this.formatArray(wxrJSON).rss.channel;
  }

  /**
   * 执行导入
   */
  async run(file) {
    const channel = await this.parseFile(file);
    return await this.importData(channel);
  }
};
