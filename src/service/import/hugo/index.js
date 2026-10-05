const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const JSZip = require('jszip');
const Base = require('../base');
const {normalizeEntry} = require('./parser');

function isMarkdown(filename) {
  return /\.md$/i.test(filename) && !/(^|\/)_index\.md$/i.test(filename);
}

function safeArchiveEntry(filename) {
  const normalized = filename.replace(/\\/g, '/');
  return !path.posix.isAbsolute(normalized) && !normalized.split('/').includes('..');
}

function contentEntries(filenames) {
  const markdown = filenames.filter(name => safeArchiveEntry(name) && isMarkdown(name));
  const content = markdown.filter(name => /(^|\/)content\//i.test(name));
  return content.length ? content : markdown;
}

module.exports = class extends Base {
  constructor(controller) {
    super(controller);
    this.controller = controller;
  }

  async user() {
    return 0;
  }

  async addTerms(items, key, model, method) {
    const names = [...new Set(items.flatMap(item => item[key]))];
    let count = 0;
    for (const name of names) {
      const result = await model[method]({name, pathname: name, ...(key === 'categories' ? {pid: 0} : {})});
      if (result.type === 'add') count++;
    }
    return count;
  }

  category(items) {
    return this.addTerms(items, 'categories', this.cateModelInstance, 'addCate');
  }

  tag(items) {
    return this.addTerms(items, 'tags', this.tagModelInstance, 'addTag');
  }

  async termIds(model, names) {
    if (!names.length) return [];
    const terms = await model.setRelation(false).where({name: ['IN', names]}).select();
    return terms.map(item => item.id);
  }

  async buildPost(item, type) {
    const user = await this.controller.session('userInfo');
    let post = {
      title: item.title,
      pathname: item.pathname,
      markdown_content: item.markdown_content,
      create_time: this.formatDate(new Date(item.created_at)),
      update_time: this.formatDate(new Date(item.updated_at)),
      status: item.draft ? 0 : 3,
      user_id: user.id,
      comment_num: 0,
      allow_comment: item.allow_comment,
      is_public: item.is_public,
      type
    };
    post = await this.postModelInstance.getContentAndSummary(post);
    return post;
  }

  async post(items) {
    const posts = items.filter(item => !item.page);
    for (const item of posts) {
      const post = await this.buildPost(item, 0);
      post.cate = await this.termIds(this.cateModelInstance, item.categories);
      post.tag = await this.termIds(this.tagModelInstance, item.tags);
      await this.postModelInstance.addPost(post);
    }
    return posts.length;
  }

  async page(items) {
    const pages = items.filter(item => item.page);
    for (const item of pages) {
      await this.pageModelInstance.addPost(await this.buildPost(item, 1));
    }
    return pages.length;
  }

  async parseZip(file) {
    const zip = await JSZip.loadAsync(fs.readFileSync(file.path));
    const names = contentEntries(Object.values(zip.files).filter(entry => !entry.dir).map(entry => entry.name));
    const entries = names.map(name => zip.files[name]);
    return Promise.all(entries.map(async entry => normalizeEntry(entry.name, await entry.async('string'), entry.date)));
  }

  parseTar(file) {
    const entries = contentEntries(execFileSync('tar', ['-tzf', file.path], {encoding: 'utf8'})
      .split(/\r?\n/)
      .filter(Boolean));
    return entries.map(name => normalizeEntry(name, execFileSync('tar', ['-xOzf', file.path, name], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024
    })));
  }

  async parseFile(file) {
    try {
      const items = /\.zip$/i.test(file.name) ? await this.parseZip(file) : this.parseTar(file);
      if (!items.length) throw new Error('NO_HUGO_CONTENT');
      return items;
    } catch (e) {
      if (e.message === 'NO_HUGO_CONTENT') throw e;
      throw new Error('INVALID_HUGO_FILE');
    }
  }

  async run(file) {
    return this.importData(await this.parseFile(file));
  }
};
