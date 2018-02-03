const Base = require('./base');

module.exports = class extends Base {
  get relation() {
    return {
      post_tag: {
        type: think.Model.HAS_MANY,
        fKey: 'tag_id'
      }
    }
  }

  addTag(data) {
    let where = {
      name: data.name,
      _logic: 'OR'
    };
    if(data.pathname) {
      where.pathname = data.pathname;
    }
    return this.where(where).thenAdd(data);
  }

  async saveTag(data) {
    let info = await this.where({id: data.id}).find();
    if(think.isEmpty(info)) {
      return Promise.reject(new Error('TAG_NOT_EXIST'));
    }

    return this.where({id: data.id}).update(data);
  }

  async deleteTag(tag_id) {
    this.model('post_tag').where({tag_id}).delete();
    return this.where({id: tag_id}).delete();
  }
}
