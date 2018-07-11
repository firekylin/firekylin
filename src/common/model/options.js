module.exports = class extends think.Model {
  /**
   * get options
   * @return {} []
   */
  async getOptions(flag) {
    let data = await this.select();
    let ret = {};
    data.forEach(item => {
      ret[item.key] = item.value;
    });

    //comment type
    if(think.isEmpty(ret)) {
      return {};
    }

    if(ret.comment && think.isString(ret.comment)) {
      ret.comment = JSON.parse(ret.comment);
    }
    if(!ret.comment) {
      ret.comment = {type: 'disqus'};
    }
    // upload settings
    if(ret.upload && think.isString(ret.upload)) {
      ret.upload = JSON.parse(ret.upload);
    }
    if(!ret.upload) {
      ret.upload = {type: 'local'};
    }
    if(ret.push_sites && think.isString(ret.push_sites)) {
      ret.push_sites = JSON.parse(ret.push_sites);
    }
    if(!ret.push_sites) {
      ret.push_sites = {};
    }
    if(ret.rssImportList && think.isString(ret.rssImportList)) {
      ret.rssImportList = JSON.parse(ret.rssImportList);
    }
    if(!ret.rssImportList) {
      ret.rssImportList = [];
    }
    return ret;
  }
  /**
   * update options
   * @return {} []
   */
  async updateOptions(key, value) {
    let data = think.isObject(key) ? think.extend({}, key) : {[key] : value};
    let promises = [];
    for(let key in data) {
      let value = data[key];
      let exist = await this.where({key: key}).count('key');
      let p;
      if(exist) {
        p = this.where({key: key}).update({value: value});
      }else{
        p = this.add({key, value});
      }
      promises.push(p);
    }
    await Promise.all(promises);
    await this.getOptions(true);

    // if `auto_summary` is changed, then rebuild all summaries of posts
    if (typeof data.auto_summary !== 'undefined') {
      const postModel = think.model('post', {}, 'admin');
      // doesn't wait for return
      await postModel.updateAllPostSummaries();
    }
  }
}
