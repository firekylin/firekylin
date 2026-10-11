const Post = require('./post');
const {emit, filter} = require('../plugin/runtime');

module.exports = class extends Post {
  constructor(...args) {
    super(...args);
    this.modelName = 'post';
  }

  async addPost(data) {
    const create_time = think.datetime();
    data = Object.assign({
      type: 1,
      status: 0,
      create_time,
      update_time: create_time,
      is_public: 1
    }, data);

    const prepared = await filter('content.beforeCreate', data, {type: 'page'});
    const result = await this.where({pathname: prepared.pathname}).thenAdd(prepared);
    const page = result || prepared;
    await emit('page.created', {page});
    await emit('content.created', {post: page, type: 'page'});
    return result;
  }

  async savePost(data) {
    const info = await this.where({id: data.id, type: 1}).find();
    if (think.isEmpty(info)) {
      return Promise.reject(new Error('PAGE_NOT_EXIST'));
    }

    data.update_time = think.datetime();
    const prepared = await filter('content.beforeUpdate', data, {type: 'page'});
    const result = await this.where({id: data.id}).update(prepared);
    await emit('page.updated', {page: prepared, result});
    await emit('content.updated', {post: prepared, type: 'page', result});
    return result;
  }
};
