'use strict';

import request from 'request';

export default class extends think.service.base {
  /**
   * init
   * @return {}         []
   */
  init(...args){
    super.init(...args);
  }
  /**
   * sync post comments
   * @return {[type]} [description]
   */
  async sync(){
    let optionsModel = this.model('options');
    let options = await optionsModel.getOptions();
    let comment = options.comment;
    if(comment.type === 'disqus'){
      return this.syncFromDisqus(comment);
    }else if(comment.type === 'duoshuo'){
      return this.syncFromDuoshuo(comment);
    }
  }
  /**
   * sync from disqus
   * @return {[type]} [description]
   */
  syncFromDisqus(comment){
    
  }
  /**
   * sync from duoshuo
   * @return {[type]} [description]
   */
  async syncFromDuoshuo(comment){
    let allPost = await this.model('post').setRelation(false).field('id,pathname,comment_num').select();
    let keys = {};
    let threads = allPost.map(item => {
      let key = think.md5(item.pathname);
      keys[key] = {id: item.id, comment_num: item.comment_num};
      return key;
    }).join(',');
    let url = `http://api.duoshuo.com/threads/counts.json?short_name=${comment.name}&threads=${threads}`;
    think.log(`sync comments from ${url}`);
    let fn = think.promisify(request, request);
    let response = await fn(url);
    let data = JSON.parse(response.body).response;
    let promises = [];
    for(let key in data){
      if(data[key].comments === keys[key].comment_num){
        continue;
      }
      let id = keys[key].id;
      let promise = this.model('post').where({id: id}).update({comment_num: data[key].comments});
      promises.push(promise);
    }
    return Promise.all(promises);
  }
}