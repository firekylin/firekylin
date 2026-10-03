const Base = require('./base');

module.exports = class extends Base {
  get relation() {
    return {
      post_tag: {
        type: think.Model.HAS_MANY,
        fKey: 'tag_id'
      }
    };
  }

  addTag(data) {
    const where = {
      name: data.name,
      _logic: 'OR'
    };
    if (data.pathname) {
      where.pathname = data.pathname;
    }
    return this.where(where).thenAdd(data);
  }

  async saveTag(data) {
    const info = await this.where({id: data.id}).find();
    if (think.isEmpty(info)) {
      return Promise.reject(new Error('TAG_NOT_EXIST'));
    }

    return this.where({id: data.id}).update(data);
  }

  async deleteTag(tag_id) {
    this.model('post_tag').where({tag_id}).delete();
    return this.where({id: tag_id}).delete();
  }

  /**
   * get hot tags
   * @return {} []
   */
  async getHotTags() {
    const data = await this.getTagArchive();
    return data.slice(0, 5);
  }

  /**
   * 获取标签数据
   *
   * @return {Promise}
   */
  async getTagArchive() {
    const data = await this.model('post_tag')
      .join({
        table: 'post',
        on: ['post_id', 'id']
      })
      .join({
        table: 'tag',
        on: ['tag_id', 'id']
      })
      .where({
        type: 0,
        status: 3,
        is_public: 1
      })
      .order('update_time DESC')
      .select();

    const result = {};
    for (const tag of data) {
      if (result[tag.pathname]) {
        result[tag.pathname].count += 1;
      } else {
        result[tag.pathname] = {
          id: tag.id,
          name: tag.name,
          pathname: encodeURIComponent(tag.pathname),
          update_time: tag.update_time,
          count: 1
        };
      }
    }

    return Object.values(result).sort((a, b) => a.count > b.count ? -1 : 1);
  }
};
