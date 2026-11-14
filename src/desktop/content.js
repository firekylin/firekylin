'use strict';

const {DesktopError} = require('./operations');
const permalink = require('../service/permalink');

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
function number(value) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1) throw new DesktopError('INVALID_ID');
  return result;
}
function text(value, maximum, empty = true) {
  if (typeof value !== 'string' || value.length > maximum || (!empty && !value.trim())) {
    throw new DesktopError('INVALID_TEXT');
  }
  return value;
}
function options(value) {
  try {
    const result = typeof value === 'string' ? JSON.parse(value) : value;
    return result && typeof result === 'object' && !Array.isArray(result) ? result : {};
  } catch { throw new DesktopError('INVALID_STORED_OPTIONS', 409); }
}

class Content {
  constructor({getModel, principal, siteOptions, constants = global.firekylin}) {
    this.getModel = getModel;
    this.principal = principal;
    this.options = siteOptions;
    this.constants = constants;
  }
  get admin() { return Number(this.principal.type) === this.constants.USER_ADMIN; }
  type(kind) {
    if (!['articles', 'pages'].includes(kind)) throw new DesktopError('INVALID_CONTENT_TYPE');
    return kind === 'articles' ? this.constants.POST_ARTICLE : this.constants.POST_PAGE;
  }
  where(kind) {
    return {type: this.type(kind), ...(!this.admin ? {user_id: Number(this.principal.id)} : {})};
  }
  present(row) {
    const values = options(row.options);
    const passwordProtected = Boolean(values.postPasswordHash);
    delete values.postPasswordHash;
    return {
      id: Number(row.id), kind: Number(row.type) === this.constants.POST_PAGE ? 'page' : 'article',
      title: row.title || '', body: row.markdown_content || '', pathname: row.pathname || '',
      status: Number(row.status), visibility: Number(row.is_public), comments: Number(row.allow_comment),
      revision: Number(row.revision), updatedAt: row.update_time, summary: row.summary || '',
      cover: values.featuredImage || '',
      categories: row.cate || [], tags: row.tag || [], options: values, passwordProtected,
      url: new URL(permalink.generate(row.type, row, this.options), this.options.site_url).href,
      capabilities: {edit: true, delete: true, publish: this.admin, submit: !this.admin}
    };
  }
  async get(kind, id, getModel = this.getModel) {
    const row = await getModel('post').where({...this.where(kind), id: number(id)}).find();
    if (!row || !row.id) throw new DesktopError('CONTENT_NOT_FOUND', 404);
    return row;
  }
  async list(kind, query) {
    const where = this.where(kind);
    const page = query.page === undefined ? 1 : number(query.page);
    if (query.status !== undefined && query.status !== '') {
      const value = Number(query.status);
      if (![this.constants.POST_DRAFT, this.constants.POST_AUDITING,
        this.constants.POST_REJECT, this.constants.POST_PUBLISH].includes(value)) {
        throw new DesktopError('INVALID_STATUS');
      }
      where.status = value;
    }
    if (query.keyword) where['title|markdown_content'] = ['LIKE', '%' + text(query.keyword, 200) + '%'];
    const result = await this.getModel('post').where(where).order('update_time DESC, id DESC')
      .page(page, 30)
      .countSelect();
    return {items: result.data.map(row => this.present(row)), total: Number(result.count), page, pageSize: 30};
  }
  async attributes(kind, input, previous, getModel) {
    const allowed = ['title', 'body', 'pathname', 'visibility', 'comments', 'summary', 'cover',
      'categories', 'tags', 'revision', 'action'];
    if (Object.keys(input).some(key => !allowed.includes(key))) throw new DesktopError('UNKNOWN_ATTRIBUTE');
    const data = {type: this.type(kind)};
    for (const [key, field, maximum] of [['title', 'title', 255], ['body', 'markdown_content', 1000000],
      ['pathname', 'pathname', 255], ['summary', 'summary', 10000]]) {
      if (own(input, key)) data[field] = text(input[key], maximum);
    }
    if (own(data, 'pathname') && (!data.pathname || !/^[\p{L}\p{N}_-]+$/u.test(data.pathname))) {
      throw new DesktopError('INVALID_PATHNAME');
    }
    if (data.pathname && data.pathname !== previous?.pathname) {
      const duplicate = await getModel('post').where({pathname: data.pathname}).setRelation(false)
        .find();
      if (duplicate?.id) throw new DesktopError('PATHNAME_EXISTS', 409);
    }
    for (const [key, field] of [['visibility', 'is_public'], ['comments', 'allow_comment']]) {
      if (own(input, key)) {
        if (![0, 1].includes(input[key])) throw new DesktopError('INVALID_ATTRIBUTE');
        data[field] = input[key];
      }
    }
    const mergedOptions = options(previous?.options || '{}');
    if (own(input, 'cover')) {
      const cover = text(input.cover, 2048);
      if (cover && !/^https?:\/\//i.test(cover)) throw new DesktopError('INVALID_COVER');
      mergedOptions.featuredImage = cover;
    }
    data.options = JSON.stringify(mergedOptions);
    for (const [key, relation, idField] of [['categories', 'cate', 'cate_id'], ['tags', 'tag', 'tag_id']]) {
      if (!own(input, key)) continue;
      if (kind === 'pages') throw new DesktopError('PAGE_TAXONOMY_UNSUPPORTED');
      if (!Array.isArray(input[key]) || input[key].length > 100) throw new DesktopError('INVALID_TAXONOMY');
      const ids = [...new Set(input[key].map(number))];
      const rows = ids.length ? await getModel(relation).where({id: ['IN', ids]}).select() : [];
      if (rows.length !== ids.length) throw new DesktopError('TAXONOMY_NOT_FOUND', 409);
      data[relation] = rows.map(row => ({[idField]: row.id}));
    }
    const action = input.action || 'save';
    if (!['save', 'publish', 'submit', 'update'].includes(action)) throw new DesktopError('INVALID_ACTION');
    if (action === 'publish' || action === 'update') {
      if (!this.admin) throw new DesktopError('PUBLICATION_FORBIDDEN', 403);
      data.status = this.constants.POST_PUBLISH;
    } else if (action === 'submit') {
      data.status = this.constants.POST_AUDITING;
    } else {
      if (previous && Number(previous.status) === this.constants.POST_PUBLISH) {
        throw new DesktopError('EXPLICIT_UPDATE_REQUIRED', 409);
      }
      data.status = this.constants.POST_DRAFT;
    }
    if (data.status !== this.constants.POST_DRAFT &&
      !(data.title ?? previous?.title ?? '').trim()) throw new DesktopError('TITLE_REQUIRED');
    return data;
  }
  async write(kind, id, input) {
    const root = this.getModel('post');
    root.config = {...root.config, reuseDB: true};
    const getModel = name => name === 'post' ? root : root.model(name);
    return root.transaction(async() => {
      let previous;
      if (id) {
        previous = await this.get(kind, id, getModel);
        // Claim a revision in the transaction before model lifecycle/relation writes.
        const changed = await root.setRelation(false).where({id: previous.id, revision: number(input.revision)})
          .update({revision: ['exp', 'revision + 1']});
        if (Number(changed) !== 1) throw new DesktopError('REVISION_CONFLICT', 409);
        root.setRelation(true);
      }
      const data = await this.attributes(kind, input, previous, getModel);
      root.setRelation(true);
      let resultId;
      if (previous) {
        const merged = {...previous, ...data, id: previous.id};
        const rendered = await root.getContentAndSummary(merged);
        await root.savePost({...data, id: previous.id, content: rendered.content, summary: rendered.summary});
        resultId = previous.id;
      } else {
        if (!data.pathname) throw new DesktopError('PATHNAME_REQUIRED');
        const prepared = await root.getContentAndSummary({
          markdown_content: '', ...data, user_id: Number(this.principal.id)
        });
        const created = await root.addPost(root.getPostTime(prepared));
        // A collision discovered by thenAdd must not return someone else's document.
        if (created.type === 'exist') throw new DesktopError('PATHNAME_EXISTS', 409);
        resultId = Number(created.id || created);
      }
      return this.present(await this.get(kind, resultId, getModel));
    });
  }
  async remove(kind, id, revision) {
    const root = this.getModel('post');
    root.config = {...root.config, reuseDB: true};
    return root.transaction(async() => {
      const row = await this.get(kind, id, () => root);
      const changed = await root.setRelation(false).where({id: row.id, revision: number(revision)})
        .update({revision: ['exp', 'revision + 1']});
      if (Number(changed) !== 1) throw new DesktopError('REVISION_CONFLICT', 409);
      await root.deletePost(row.id);
      return {id: Number(row.id), deleted: true};
    });
  }
}

module.exports = {Content, number, text, options};
