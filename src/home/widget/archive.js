const ContentsWidget = require('./base/contents');

module.exports = class extends ContentsWidget {
  constructor(...args) {
    super(...args);
    this.archiveType = this.parameter.type || 'index';
    this.pagination = null;
    this.archiveTitle = '';
    this.archiveSlug = '';
    this.grouped = {};
    this.keyword = '';
  }

  async execute() {
    switch (this.archiveType) {
      case 'post':
        return this.executePost();
      case 'page':
        return this.executePage();
      case 'archive':
        return this.executeArchive();
      case 'search':
        return this.executeSearch();
      default:
        return this.executeList();
    }
  }

  async executeList() {
    const where = {
      tag: this.controller.get('tag'),
      cate: this.controller.get('cate')
    };
    const author = this.controller.get('name');
    if (author) {
      const user = await this.model('user').where({name: author}).find();
      if (!think.isEmpty(user)) where.where = {user_id: user.id};
    }

    if (where.tag) {
      const tag = await this.findMeta('tag', where.tag);
      if (think.isEmpty(tag)) return this.controller.ctx.throw(404);
      this.archiveTitle = tag.name;
      this.archiveSlug = tag.pathname;
      where.tag = tag.pathname;
    }
    if (where.cate) {
      const cate = await this.findMeta('cate', where.cate);
      if (think.isEmpty(cate) || !cate.name) return this.controller.ctx.throw(404);
      this.archiveTitle = cate.name;
      this.archiveSlug = cate.pathname;
      where.cate = cate.pathname;
    }

    const result = await this.model('post').getPostList(this.controller.get('page'), where);
    if (!result) return;
    const {data, ...pagination} = result;
    this.pagination = pagination;
    this.pushAll(data);
  }

  findMeta(name, value) {
    return this.model(name).where({
      _logic: 'OR',
      name: value,
      pathname: value
    }).find();
  }

  async executePost() {
    let detail = await this.getPreview();
    detail = detail || await this.model('post').getPostDetail(this.controller.get('pathname'));
    if (!think.isEmpty(detail)) this.push(Object.assign({type: 0}, detail));
  }

  async executePage() {
    let detail = await this.getPreview();
    detail = detail || await this.model('post')
      .setRelation(false)
      .where({
        pathname: this.controller.get('pathname'),
        is_public: 1,
        type: 1,
        status: 3
      })
      .find();
    if (!think.isEmpty(detail)) this.push(Object.assign({type: 1}, detail));
  }

  async getPreview() {
    if (!this.controller.get('preview')) return null;
    try {
      const previewData = JSON.parse(this.controller.post('previewData'));
      return think.model('post', null, 'admin').getContentAndSummary(previewData);
    } catch (e) {
      return null;
    }
  }

  async executeArchive() {
    const groups = await this.model('post').getPostArchive();
    Object.entries(groups).forEach(([date, posts]) => {
      this.grouped[date] = posts.map(post => this.push(post));
    });
  }

  async executeSearch() {
    this.keyword = String(this.controller.get('keyword') || '').trim();
    if (!this.keyword) return;
    const result = await this.model('post').getPostSearch(this.keyword, this.controller.get('page'));
    const {data, ...pagination} = result;
    this.pagination = pagination;
    this.pushAll(data);
  }

  pageUrl(page) {
    const query = Object.assign({}, this.controller.ctx.query, {page});
    const search = Object.keys(query)
      .filter(key => query[key] !== '' && query[key] !== null && typeof query[key] !== 'undefined')
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');
    return `${this.controller.ctx.path}${search ? `?${search}` : ''}`;
  }

  is(type) {
    if (type === this.archiveType) return true;
    if (type === 'tag') return Boolean(this.controller.get('tag'));
    if (type === 'category' || type === 'cate') return Boolean(this.controller.get('cate'));
    if (type === 'author') return Boolean(this.controller.get('name'));
    return false;
  }
};
