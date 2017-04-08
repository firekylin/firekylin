'use strict';
/**
 * model
 */
export default class extends think.model.relation {

  relation = {
    post_cate: {
      type: think.model.HAS_MANY,
      field: 'cate_id'
    }
  };

  async getCateArchive() {
    let data = await this.model('post_cate')
      .join({
        table: 'post',
        on: ['post_id', 'id']
      })
      .join({
        table: 'cate',
        on: ['cate_id', 'id']
      })
      .where({
        type: 0,
        status: 3,
        is_public: 1
      })
      .order('update_time DESC')
      .select();

    let result = {};
    for(let cate of data) {
      if(result[cate.pathname]) {
        result[cate.pathname].count += 1;
      } else {
        result[cate.pathname] = {
          name: cate.name,
          pathname: encodeURIComponent(cate.pathname),
          update_time: cate.update_time,
          count: 1
        };
      }
    }
    return Object.values(result).sort((a, b)=> a.count>b.count ? -1 : 1);
  }
}
