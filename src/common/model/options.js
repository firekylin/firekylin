'use strict';
/**
 * model
 */
export default class extends think.model.base {
  /**
   * options cache key
   * @type {String}
   */
  cacheKey = 'website_options';
  /**
   * cache options
   * @type {Object}
   */
  cacheOptions = {
    timeout: 30 * 24 * 3600 * 1000,
    type: !think.isMaster ? 'file' : 'memory'
  };
  /**
   * get options
   * @return {} []
   */
  async getOptions(flag){
    if(flag === true){
      await think.cache(this.cacheKey, null);
    }
    let ret = await think.cache(this.cacheKey, async () => {
      let data = await this.select();
      let result = {};
      data.forEach(item => {
        result[item.key] = item.value;
      });
      return result;
    }, this.cacheOptions);
    //comment type
    if(ret){
      if(ret.comment && think.isString(ret.comment)){
        ret.comment = JSON.parse(ret.comment);
      }else{
        ret.comment = {type: 'disqus'};
      }
    }
    return ret;
  }
  /**
   * update options
   * @return {} []
   */
  async updateOptions(key, value){
    let data = think.isObject(key) ? think.extend({}, key) : {[key] : value};
    let cacheData = await think.cache(this.cacheKey, undefined, this.cacheOptions);
    if(think.isEmpty(cacheData)){
      cacheData = await this.getOptions();
    }
    let changedData = {};
    for(let key in data){
      if(data[key] !== cacheData[key]){
        changedData[key] = data[key];
      }
    }
    //data is not changed
    if(think.isEmpty(changedData)){
      return;
    }
    let p1 = think.cache(this.cacheKey, think.extend(cacheData, changedData), this.cacheOptions);
    let promises = [p1];
    for(let key in changedData){
      let value = changedData[key];
      let p = this.where({key: key}).update({value: value});
      promises.push(p);
    }
    await Promise.all(promises);
    await this.getOptions(true);
  }
}