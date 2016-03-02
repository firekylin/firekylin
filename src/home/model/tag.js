'use strict';
/**
 * model
 */
export default class extends think.model.relation {

  relation = {
    post_tag: {
      type: think.model.HAS_MANY,
      field: 'tag_id'
    }
  };

  /**
   * get hot tags
   * @return {} []
   */
  async getHotTags(){
    let data = await this.getTagArchive();
    return data.slice(0, 5);
  }

  async getTagArchive(){
    let data = await this.select();
    data = data.map(item => {
      item.count = item.post_tag.length;
      return item;
    }).sort((a, b) => {
      return a.count > b.count ? -1 : 1;
    })
    return data;
  }
}