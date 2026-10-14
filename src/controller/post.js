const fs = require('fs');
const path = require('path');
const Base = require('./base');
const {emit} = require('../plugin/runtime');

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
    await emit('archive.beforeQuery', {controller: this, type: 'index'});
    await this.getWidget('Widget_Archive', {type: 'index'});
    await emit('archive.index', {controller: this});

    let template = 'index';
    if (this.get('tag')) {
      const tagView = await stats(path.join(this.THEME_VIEW_PATH, 'tag_index.eta'))
        .then(() => true)
        .catch(() => false);
      if (tagView) {
        template = 'tag_index';
      }
    }
    if (this.get('cate')) {
      const cateView = await stats(path.join(this.THEME_VIEW_PATH, 'cate_index.eta'))
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
    await emit('archive.beforeQuery', {controller: this, type: 'single'});
    this.ctx.url = decodeURIComponent(this.ctx.url);
    // 列表页
    if (this.get('pathname') === 'list') {
      return this.listAction();
    }

    const archive = await this.getWidget('Widget_Archive', {type: 'post'});
    this.archive = archive;
    if (!archive.have()) {
      return this.redirect('/');
    }

    return this.displayView('post');
  }

  async pageAction() {
    await emit('archive.beforeQuery', {controller: this, type: 'page'});
    const archive = await this.getWidget('Widget_Archive', {type: 'page'});
    this.archive = archive;

    let template = 'page';
    if (archive.have()) {
      try {
        const options = archive.stack[0].options;
        if (options.template) {
          const templateName = options.template.replace(/\.html$/, '.eta');
          /* let stat = */await stats(path.join(this.THEME_VIEW_PATH, 'template', templateName));
          template = path.join('template', templateName.replace(/\.eta$/, ''));
        }
      } catch (e) {
        console.log(e); // eslint-disable-line no-console
      }
    }

    return this.displayView(template);
  }

  async attachmentAction() {
    const archive = await this.getWidget('Widget_Archive', {type: 'attachment'});
    this.archive = archive;
    if (!archive.have()) return this.ctx.throw(404);

    this.assign('attachment', archive.stack[0].options.attachment || {});
    if (/\.json(?:\?|$)/.test(this.ctx.url)) return this.displayView('attachment');

    // Typecho 同样优先使用附件模板，并依次回退到页面、文章模板。
    // Firekylin 模板会主动获取 Widget_Archive，因此在回退期间复用当前附件实例，
    // 避免 page.eta / post.eta 按各自内容类型重新查询。
    const widget = this.assign('widget');
    const attachmentWidget = (name, params = {}) => {
      if (name === 'Widget_Archive' && ['attachment', 'page', 'post'].includes(params.type)) {
        return Promise.resolve(archive);
      }
      return widget(name, params);
    };
    attachmentWidget.destroy = widget.destroy;
    this.assign('widget', attachmentWidget);

    for (const template of ['attachment', 'page', 'post']) {
      const exists = await stats(path.join(this.THEME_VIEW_PATH, `${template}.eta`))
        .then(() => true)
        .catch(() => false);
      if (exists) return this.displayView(template);
    }
    return this.ctx.throw(500, 'THEME_TEMPLATE_NOT_FOUND');
  }
  /**
   * post archive
   * @return {[type]} [description]
   */
  async archiveAction() {
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
    await emit('archive.search', {controller: this, keyword: this.get('keyword') || this.get('s')});
    return this.displayView('search');
  }
};
