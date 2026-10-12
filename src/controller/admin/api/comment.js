'use strict';
/* eslint-disable max-len */

const Base = require('./base');

module.exports = class extends Base {
  async getAction() {
    const page = Math.max(Number(this.get('page')) || 1, 1);
    const pageSize = Math.min(Math.max(Number(this.get('pageSize')) || 20, 1), 100);
    const status = this.get('status');
    const keyword = String(this.get('keyword') || '').trim();
    const author = String(this.get('author') || '').trim();
    const where = status ? {status} : {};
    if (keyword) where.comment = ['LIKE', `%${keyword}%`];
    if (author) {
      const pattern = `%${author}%`;
      const matchedUsers = await this.model('user').where({
        name: ['LIKE', pattern],
        display_name: ['LIKE', pattern],
        email: ['LIKE', pattern],
        _logic: 'OR'
      }).field('id')
        .select();
      where._complex = {
        nick: ['LIKE', pattern],
        mail: ['LIKE', pattern],
        ip: ['LIKE', pattern],
        ...(matchedUsers.length ? {user_id: ['IN', matchedUsers.map(user => String(user.id))]} : {}),
        _logic: 'OR'
      };
    }
    const model = this.model('comment');
    const [total, data] = await Promise.all([
      model.where(where).count(),
      model.where(where).order('inserted_at DESC').page(page, pageSize)
        .select()
    ]);
    const userIds = [...new Set(data.map(item => item.user_id).filter(Boolean))];
    const postIds = [...new Set(data.map(item => Number(item.post_id)).filter(Boolean))];
    const [users, posts] = await Promise.all([
      userIds.length ? this.model('user').where({id: ['IN', userIds]}).field('id,name,display_name,email,url,avatar')
        .select() : [],
      postIds.length ? this.model('post').where({id: ['IN', postIds]}).field('id,title,pathname,type')
        .select() : []
    ]);
    const userMap = new Map(users.map(user => [String(user.id), user]));
    const postMap = new Map(posts.map(post => [Number(post.id), post]));
    const rows = data.map(item => {
      const user = userMap.get(String(item.user_id)) || {};
      const email = user.email || item.mail || '';
      const post = postMap.get(Number(item.post_id));
      const postUrl = post ? `/${Number(post.type) === 1 ? 'page' : 'post'}/${post.pathname}.html` : item.url;
      return {
        ...item,
        author_name: user.display_name || user.name || item.nick || '匿名',
        author_email: email,
        author_link: user.url || item.link || '',
        author_avatar: user.avatar || `https://seccdn.libravatar.org/avatar/${think.md5(String(email).toLowerCase())}?d=mp`,
        post_title: post ? post.title : item.url,
        post_url: postUrl
      };
    });
    return this.success({page, pageSize, total: Number(total), keyword, author, data: rows});
  }

  async postAction() {
    const id = Number(this.post('id'));
    const action = this.post('operation');
    if (!id) return this.fail('PARAMS_ERROR');
    const model = this.model('comment');
    const comment = await model.where({id}).find();
    if (think.isEmpty(comment)) return this.fail('COMMENT_NOT_FOUND');
    if (action === 'delete') await model.where({id}).delete();
    else if (['approved', 'waiting', 'spam'].includes(action)) await model.where({id}).update({status: action, updated_at: think.datetime()});
    else if (action === 'edit') await model.where({id}).update({comment: String(this.post('comment') || ''), updated_at: think.datetime()});
    else return this.fail('INVALID_OPERATION');
    await this.service('comment').syncCount(this, comment.post_id);
    return this.success();
  }
};
