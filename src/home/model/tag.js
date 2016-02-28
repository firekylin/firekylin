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

  async getTagArchive(){
    let data = await this.select();
    data = data.map(item => {
      item.count = item.post_tag.length;
      return item;
    })
    return data;
  }
}