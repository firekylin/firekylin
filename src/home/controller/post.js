const fs = require('fs');
const path = require('path');
const Base = require('./base');

const stats = think.promisify(fs.stat);

module.exports = class extends Base {
  /**
   * index action
   * @return {[type]} [description]
   */
  indexAction() {
    return this.listAction();
  }
  /**
   * post list
   * @return {Promise} []
   */
  async listAction() {
    const model = this.model('post');
    const where = {
      tag: this.get('tag'),
      cate: this.get('cate')
    };
    if (this.get('name')) {
      const user = await this.model('user').where({ name: this.get('name') }).find();
      if (!think.isEmpty(user)) {
        where.where = { user_id: user.id };
      }
    }

    let tagName = ''; let cateName = '';
    if (where.tag) {
      const tag = await this.model('tag').where({
        _logic: 'OR',
        name: where.tag,
        pathname: where.tag
      }).find();
      if (!think.isEmpty(tag)) {
        tagName = tag.name;
        where.tag = tag.pathname;
      } else {
        return this.ctx.throw(404);
      }
    }
    if (where.cate) {
      const cate = await this.model('cate').where({
        _logic: 'OR',
        name: where.cate,
        pathname: where.cate
      }).find();

      if (!think.isEmpty(cate) && cate.name) {
        cateName = cate.name;
        where.cate = cate.pathname;
      } else {
        return this.ctx.throw(404);
      }
    }

    const list = await model.getPostList(this.get('page'), where);
    list.data.forEach(post => {
      post.pathname = encodeURIComponent(post.pathname);
      try {
        post.options = JSON.parse(post.options) || {};
        post.featuredImage = post.options.featuredImage;
      } catch (e) {
        post.options = {};
        post.featuredImage = '';
      }
    });
    const { data, ...pagination } = list;
    this.assign({
      posts: data,
      pagination,
      tag: tagName,
      cate: cateName,
      pathname: where.tag || where.cate
    });

    let template = 'index';
    if (where.tag) {
      const tagView = await stats(path.join(this.THEME_VIEW_PATH, 'tag_index.html'))
        .then(() => true)
        .catch(() => false);
      if (tagView) {
        template = 'tag_index';
      }
    }
    if (where.cate) {
      const cateView = await stats(path.join(this.THEME_VIEW_PATH, 'cate_index.html'))
        .then(() => true)
        .catch(() => false);
      if (cateView) {
        template = 'cate_index';
      }
    }
    return this.displayView(template);
  }
  /**
   * post detail
   * @return {[type]} [description]
   */
  async detailAction() {
    this.ctx.url = decodeURIComponent(this.ctx.url);
    const pathname = this.get('pathname');
    // 列表页
    if (pathname === 'list') {
      return this.listAction();
    }

    let detail;
    // 在线预览
    if (this.get('preview')) {
      try {
        const previewData = JSON.parse(this.post('previewData'));
        detail = await think.model('post', null, 'admin').getContentAndSummary(previewData);
      } catch (e) {
        // Ignore JSON parse error
      }
    }

    detail = detail || await this.model('post').getPostDetail(pathname);
    if (think.isEmpty(detail)) {
      return this.redirect('/');
    }
    detail.pathname = encodeURIComponent(detail.pathname);
    if (!think.isEmpty(detail.tag)) {
      detail.tag.forEach(t => t.pathname = encodeURIComponent(t.pathname));
    }
    if (!think.isEmpty(detail.cate)) {
      detail.cate.forEach(c => c.pathname = encodeURIComponent(c.pathname));
    }
    try {
      detail.options = JSON.parse(detail.options) || {};
      detail.featuredImage = detail.options.featuredImage;
    } catch (e) {
      detail.options = {};
      detail.featuredImage = '';
    }
    if (!think.isEmpty(detail.prev)) {
      detail.prev.pathname = encodeURIComponent(detail.prev.pathname);
    }
    if (!think.isEmpty(detail.next)) {
      detail.next.pathname = encodeURIComponent(detail.next.pathname);
    }
    this.assign('post', detail);

    return this.displayView('post');
  }

  async pageAction() {
    const pathname = this.get('pathname');
    let detail;
    if (this.get('preview')) {
      try {
        const previewData = JSON.parse(this.post('previewData'));
        detail = await think.model('post', null, 'admin').getContentAndSummary(previewData);
      } catch (e) {
        // Ignore JSON parse error
      }
    }
    detail = detail || await this.model('post')
      .setRelation(false)
      .where({
        pathname,
        is_public: 1, // 公开
        type: 1, // 文章
        status: 3 // 已经发布
      })
      .find();
    detail.pathname = encodeURIComponent(detail.pathname);
    try {
      detail.options = JSON.parse(detail.options) || {};
      detail.featuredImage = detail.options.featuredImage;
    } catch (e) {
      detail.options = {};
      detail.featuredImage = '';
    }
    this.assign('page', detail);
    this.assign('pathname', pathname);

    let template = 'page';
    if (detail.options) {
      try {
        if (detail.options.template) {
          /* let stat = */await stats(path.join(this.THEME_VIEW_PATH, 'template', detail.options.template));
          template = path.join('template', detail.options.template.slice(0, -5));
        }
      } catch (e) {
        console.log(e); // eslint-disable-line no-console
      }
    }

    return this.displayView(template);
  }
  /**
   * post archive
   * @return {[type]} [description]
   */
  async archiveAction() {
    const model = this.model('post');
    const data = await model.getPostArchive();
    for (const i in data) { data[i].map(post => post.pathname = encodeURIComponent(post.pathname)) }
    this.assign('list', data);
    return this.displayView('archive');
  }

  async tagAction() {
    return this.displayView('tag');
  }

  async cateAction() {
    return this.displayView('cate');
  }
  /**
   * search action
   * @return {[type]} [description]
   */
  async searchAction() {
    let keyword = this.get('keyword');
    if (keyword) {
      keyword = keyword.trim();
      const postModel = this.model('post');
      const searchResult = await postModel.getPostSearch(keyword, this.get('page'));
      searchResult.data = searchResult.data.map(item => {
        item.pathname = encodeURIComponent(item.pathname);
        return item;
      });
      this.assign('searchData', searchResult);
      this.assign('pagination', searchResult);
    }

    // 热门标签
    const tagModel = this.model('tag');
    const hotTags = await tagModel.getHotTags();
    this.assign('hotTags', hotTags);

    this.assign('keyword', keyword);
    return this.displayView('search');
  }
};
