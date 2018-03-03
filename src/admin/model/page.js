const Post = require('./post');

module.exports = class extends Post {
  constructor(...args) {
    super(...args);
    this.modelName = 'post';
  }

  addPost(data) {
    let create_time = think.datetime();
    data = Object.assign({
      type: 1,
      status: 0,
      create_time,
      update_time: create_time,
      is_public: 1
    }, data);

    return this.where({pathname: data.pathname}).thenAdd(data);
  }

  async savePost(data) {
    let info = await this.where({id: data.id, type: 1}).find();
    if(think.isEmpty(info)) {
      return Promise.reject(new Error('PAGE_NOT_EXIST'));
    }

    data.update_time = think.datetime();
    return this.where({id: data.id}).update(data);
  }

}
