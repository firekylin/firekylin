'use strict';

/**
 * Shared operations for the admin backend and AI tool adapters.
 * All write operations take an authenticated principal and use the existing
 * Firekylin post model lifecycle methods (rendering, hooks and cache clearing).
 */
class PostCommandService {
  constructor({getModel, now}) {
    if (typeof getModel !== 'function' || typeof now !== 'function') {
      throw new TypeError('Model and clock are required');
    }
    this.getModel = getModel;
    this.now = now;
  }

  actor(principal) {
    if (!principal || !Number.isSafeInteger(Number(principal.id)) ||
        Number(principal.id) < 1 || ![1, 2, 3].includes(Number(principal.type))) {
      throw new Error('Authenticated author required');
    }
    return {id: Number(principal.id), type: Number(principal.type)};
  }

  async editable(id, principal) {
    const actor = this.actor(principal);
    if (!Number.isSafeInteger(id) || id < 1) throw new TypeError('Invalid post ID');
    const model = this.getModel();
    const where = {id, type: 0};
    if (actor.type !== 1) where.user_id = actor.id;
    const post = await model.where(where).setRelation(false).find();
    if (!post || !post.id) throw new Error('Post not found or permission denied');
    return post;
  }

  async resolveTags(tags, getTagModel) {
    if (!tags) return [];
    if (typeof getTagModel !== 'function') throw new TypeError('Tag model factory required');
    const names = Array.isArray(tags) ? tags : [tags];
    return Promise.all(names.map(async name => {
      const result = await getTagModel().setRelation(false).where({name})
        .thenAdd({name, pathname: name});
      return {tag_id: result.id, name};
    }));
  }

  async create(input, principal, options = {}) {
    const actor = this.actor(principal);
    const model = this.getModel();
    const existing = await this.getModel().where({pathname: input.pathname, type: 0})
      .setRelation(false)
      .find();
    if (existing && existing.id) throw new Error('PATHNAME_EXIST');
    let data = {...input, type: 0, user_id: actor.id};
    if (Number(data.status) === 3 && actor.type !== 1) data.status = 1;
    if (options.forceDraft) {
      data.status = 0;
      data.is_public = 0;
    }
    if (options.getTagModel) data.tag = await this.resolveTags(data.tag, options.getTagModel);
    data = await model.getContentAndSummary(data);
    data = model.getPostTime(data);
    return model.addPost(data);
  }

  async update(input, principal, options = {}) {
    const post = await this.editable(input.id, principal);
    if (options.draftOnly && Number(post.status) !== 0) {
      throw new Error('Only drafts can be edited with posts.update_draft');
    }
    let data = {...input};
    // Editing a published article as an editor must re-enter the review queue.
    if (this.actor(principal).type !== 1 && Number(post.status) === 3) data.status = 1;
    if (data.pathname && data.pathname !== post.pathname) {
      const existing = await this.getModel().where({pathname: data.pathname, type: 0})
        .setRelation(false)
      .find();
      if (existing && existing.id && Number(existing.id) !== Number(input.id)) {
        throw new Error('PATHNAME_EXIST');
      }
    }
    const model = this.getModel();
    if (Object.prototype.hasOwnProperty.call(data, 'markdown_content') && data.markdown_content) {
      if (Number(data.status) === 3 && this.actor(principal).type !== 1) data.status = 1;
      // Preserve the original publication date on updates.
      data.update_time = this.now();
      const prepared = await model.getContentAndSummary({...post, ...data});
      data.content = prepared.content;
      data.summary = prepared.summary;
      if (options.getTagModel && data.tag) data.tag = await this.resolveTags(data.tag, options.getTagModel);
    } else if (data.create_time && options.normalizePublishTime) {
      data = options.normalizePublishTime(data, post);
    }
    const affectedRows = await model.savePost(data);
    return {id: data.id, affectedRows};
  }

  async remove(id, principal) {
    await this.editable(id, principal);
    return this.getModel().deletePost(id);
  }

  async createDraft(input, principal) {
    return this.create({
      ...input, status: 0, is_public: 0, options: '{}'
    }, principal, {forceDraft: true});
  }

  async updateDraft(input, principal) {
    const data = {id: input.id};
    for (const name of ['title', 'pathname', 'markdown_content']) {
      if (Object.prototype.hasOwnProperty.call(input, name)) data[name] = input[name];
    }
    return this.update(data, principal, {draftOnly: true});
  }

  async publish(id, principal) {
    const actor = this.actor(principal);
    if (actor.type !== 1) throw new Error('Only administrators can publish through a tool');
    const post = await this.editable(id, principal);
    if (![0, 1, 2, 3].includes(Number(post.status))) throw new Error('Invalid post status');
    if (Number(post.status) === 3) return {id, status: 3, unchanged: true};
    const affectedRows = await this.getModel().savePost({id, status: 3});
    return {id, status: 3, affectedRows};
  }

  async delete(id, principal) {
    const result = await this.remove(id, principal);
    return {id, result};
  }
}

module.exports = PostCommandService;
