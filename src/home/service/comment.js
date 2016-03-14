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
   * get post data
   * @return {[type]} [description]
   */
  async getPostData(){
    let postModel = this.model('post');
    let allPost = await postModel.setRelation(false).order('create_time DESC').field('id,pathname,comment_num').select();
    let keys = {};
    allPost.map(item => {
      let key = think.md5(item.pathname);
      keys[key] = {id: item.id, comment_num: item.comment_num};
      return key;
    });
    return keys;
  }
  /**
   * sync from disqus
   * @return {[type]} [description]
   */
  async syncFromDisqus(comment){

    let postData = await this.getPostData();
    if(think.isEmpty(postData)){
      return;
    }
    let threads = Object.keys(postData).join('&l=');
    let url = `https://${comment.name}.disqus.com/count-data.js?1=${threads}`;
    think.log(`sync comments from ${url}`);
    let fn = think.promisify(request, request);
    let response = await fn(url);
    let data = response.body.match(/DISQUSWIDGETS.displayCount\(([^\(\)]+)\);/);
    if(!data){
      return;
    }

    data = JSON.parse(data[1]).counts;
    let promises = [];
    data.forEach(item => {
      if(item.comments === postData[item.id].comment_num){
        return;
      }
      let id = postData[item.id].id;
      let promise = this.model('post').where({id: id}).update({comment_num: item.comments});
      promises.push(promise);
    })
    return Promise.all(promises);
  }
  /**
   * sync from duoshuo
   * @return {[type]} [description]
   */
  async syncFromDuoshuo(comment){
    let postData = await this.getPostData();
    if(think.isEmpty(postData)){
      return;
    }
    let threads = Object.keys(postData).join(',');
    let url = `http://api.duoshuo.com/threads/counts.json?short_name=${comment.name}&threads=${threads}`;
    think.log(`sync comments from ${url}`);
    let fn = think.promisify(request, request);
    let response = await fn(url);
    let data = JSON.parse(response.body).response;
    let promises = [];
    for(let key in data){
      if(data[key].comments === postData[key].comment_num){
        continue;
      }
      let id = postData[key].id;
      let promise = this.model('post').where({id: id}).update({comment_num: data[key].comments});
      promises.push(promise);
    }
    return Promise.all(promises);
  }
}