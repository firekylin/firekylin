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
    if (!archive.have()) {
      return this.redirect('/');
    }

    return this.displayView('post');
  }

  async pageAction() {
    await emit('archive.beforeQuery', {controller: this, type: 'page'});
    const archive = await this.getWidget('Widget_Archive', {type: 'page'});

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
