'use strict';
/**
 * model
 */
export default class extends think.model.base {
  /**
   * options cache key
   * @type {String}
   */
  cache_key = 'website_options';
  /**
   * options cache time
   * @type {Number}
   */
  cache_time = 30 * 24 * 3600 * 1000;
  /**
   * get options
   * @return {} []
   */
  getOptions(){
    return think.cache(this.cache_key, async () => {
      let data = await this.select();
      let result = {};
      data.forEach(item => {
        result[item.key] = item.value;
      });
      return result;
    }, {
      type: 'memory',
      timeout: this.cache_time
    });
  }
  /**
   * update options
   * @return {} []
   */
  updateOptions(key, value){
    let data = think.isObject(key) ? think.extend({}, key) : {[key] : value};

  }
}