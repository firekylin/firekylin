module.exports = class extends think.Model {

  get relation() {
    return {
      post_tag: {
        type: think.Model.HAS_MANY,
        field: 'tag_id'
      }
    };
  }

  /**
   * get hot tags
   * @return {} []
   */
  async getHotTags() {
    let data = await this.getTagArchive();
    return data.slice(0, 5);
  }

  /**
   * 获取标签数据
   *
   * @return {Promise}
   */
  async getTagArchive() {
    let data = await this.model('post_tag')
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

    let result = {};
    for(let tag of data) {
      if(result[tag.pathname]) {
        result[tag.pathname].count += 1;
      } else {
        result[tag.pathname] = {
          name: tag.name,
          pathname: encodeURIComponent(tag.pathname),
          update_time: tag.update_time,
          count: 1
        };
      }
    }

    return Object.values(result).sort((a, b)=> a.count>b.count ? -1 : 1);
  }
}
