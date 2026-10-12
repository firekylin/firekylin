'use strict';

/**
 * Shared operations for the admin backend and AI tool adapters.
 * All write operations take an authenticated principal and use the existing
 * Firekylin post model lifecycle methods (rendering, hooks and cache clearing).
 */
class PostCommandService {
  constructor({getModel, now}) {
    if (typeof getModel !== 'function' || typeof now !== 'function') throw new TypeError('Model and clock are required');
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

  async createDraft(input, principal) {
    const actor = this.actor(principal);
    const {title, pathname, markdown_content} = input;
    const existing = await this.getModel().where({pathname}).setRelation(false).find();
    if (existing && existing.id) throw new Error('PATHNAME_EXIST');

    const model = this.getModel();
    let data = {
      title, pathname, markdown_content,
      type: 0, status: 0, is_public: 0,
      user_id: actor.id,
      options: '{}'
    };
    data = await model.getContentAndSummary(data);
    data = model.getPostTime(data);
    return model.addPost(data);
  }

  async updateDraft(input, principal) {
    const post = await this.editable(input.id, principal);
    if (Number(post.status) !== 0) throw new Error('Only drafts can be edited with posts.updateDraft');
    const model = this.getModel();
    if (input.pathname && input.pathname !== post.pathname) {
      const existing = await this.getModel().where({pathname: input.pathname}).setRelation(false).find();
      if (existing && existing.id && Number(existing.id) !== Number(input.id)) throw new Error('PATHNAME_EXIST');
    }
    const updates = {id: input.id};
    for (const name of ['title', 'pathname', 'markdown_content']) {
      if (Object.prototype.hasOwnProperty.call(input, name)) updates[name] = input[name];
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'markdown_content')) {
      const prepared = await model.getContentAndSummary({
        type: 0, markdown_content: updates.markdown_content
      });
      updates.content = prepared.content;
      updates.summary = prepared.summary;
    }
    const affectedRows = await model.savePost(updates);
    return {id: input.id, affectedRows};
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
    await this.editable(id, principal);
    const result = await this.getModel().deletePost(id);
    return {id, result};
  }
}

module.exports = PostCommandService;
