'use strict';
import marked from "marked";
import Base from './base.js';
import markToc from "marked-toc";
import highlight from 'highlight.js';
import push2Firekylin from 'push-to-firekylin';

export default class extends Base {
  modelInstance = this.modelInstance.where({type: 0});
  /**
   * get
   * @return {[type]} [description]
   */
  async getAction(self){
    // this.modelInstance.field('id,user_id,type,status,title,pathname,create_time,update_time');
    let data;
    if( this.id ) {
      if( this.id === 'lastest' ) {
        return this.lastest();
      }
      data = await this.modelInstance.where({id: this.id}).find();
      //文章选项
      if(data.options){
        data.options = JSON.parse(data.options) || {};
      }else{
        data.options = {};
      }
    } else {
      let where = {};
      //不是管理员，只显示个人的文章
      if(this.userInfo.type !== 1){
        where.user_id = this.userInfo.id;
      }

      if(this.get('status')) {
        where.status = this.get('status');
      }

      if(this.get('keyword')) {
        let keywords = this.get('keyword').split(/\s+/g);
        if( keywords.indexOf(':public') > -1 || keywords.indexOf(':private') > -1 ) {
          where.is_public = Number(keywords.indexOf(':public') > -1);
          keywords = keywords.filter(word => word !== ':public' && word !== ':private');
        }
        if(keywords.length > 0) {
          where.title = ["like", keywords.map(word => `%${word}%`)];
        }
      }

      let field = ['id', 'title', 'user_id', 'create_time', 'update_time', 'status', 'pathname'];
      data = await this.modelInstance.where(where).field(field).order('id DESC').page( this.get('page'), 15 ).countSelect();
    }
    return this.success(data);
  }

  getBaseAction(self) {
    return super.getAction(self);
  }
  /**
   * add user
   * @return {[type]} [description]
   */
  async postAction(){
    let data = this.post();
    //check pathname
    let post = await this.modelInstance.where({pathname: data.pathname}).select();
    if( post.length > 0 ) {
      return this.fail('PATHNAME_EXIST');
    }

    /** 如果是编辑发布文章的话默认状态改为审核中 **/
    if( data.status == 3 && this.userInfo.type != 1 ) {
      data.status = 1;
    }

    /** 推送文章 **/
    this.pushPost(data);

    data.tag = await this.getTagIds(data.tag);
    data = this.getContentAndSummary(data);
    data.user_id = this.userInfo.id;
    data = this.getPostTime(data);
    data.options = data.options ? JSON.stringify(data.options) : '';

    let insertId = await this.modelInstance.addPost(data);
    return this.success({id: insertId});
  }
  /**
   * update user info
   * @return {[type]} [description]
   */
  async putAction(){
    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }
    let data = this.post();

    /** 推送文章 **/
    this.pushPost(data);

    data.id = this.id;
    data = this.getPostTime(data);
    data = this.getContentAndSummary(data);
    data.options = data.options ? JSON.stringify(data.options) : '';
    if(data.tag) {
      data.tag = await this.getTagIds(data.tag);
    }
    let rows = await this.modelInstance.savePost(data);
    return this.success({affectedRows: rows});
  }

  async deleteAction() {
    if(!this.id) {
      return this.fail('PARAMS_ERROR');
    }

    /** 如果不是管理员且不是本文作者则无权限删除文章 **/
    if(this.userInfo.type !== 1) {
      let post = await this.modelInstance.where({id: this.id}).find();
      if( post.user_id != this.userInfo.id ) {
        return this.fail('USER_NO_PERMISSION');
      }
    }

    await this.modelInstance.deletePost(this.id);
    return this.success();
  }

  async pushPost(post) {
    let postOpt = JSON.parse(post.options);
    let canPush = Array.isArray(postOpt.push_sites) && postOpt.push_sites.length > 0;
    if( post.status != 3 && post.is_public != 1 && !canPush ) {
      return;
    }
    post = think.extend({}, post);

    let options = await this.model('options').getOptions();
    let push_sites = options.push_sites;
    let push_sites_keys = postOpt.push_sites;

    if( post.markdown_content.slice(0, 5) !== '> 原文：') {
      let options = await this.model('options').getOptions();
      let site_url = options.hasOwnProperty('site_url') ? options.site_url : `http://${this.http.host}`;
      post.markdown_content = `> 原文：${site_url}/post/${post.pathname}.html

${post.markdown_content}`;
    }
    delete post.cate;
    delete post.options;

    if(!Array.isArray(push_sites_keys)) { push_sites_keys = [push_sites_keys]; }
    let pushes = push_sites_keys.map(key => {
      let {appKey, appSecret, url} = push_sites[key];
      let p2fk = new push2Firekylin(url, appKey, appSecret);
      return p2fk.push(post);
    });
    let result = await Promise.all(pushes);
    console.log('push result for debug: ', result);
  }

  async lastest() {
    let userId = this.userInfo.type !== 1 ? this.userInfo.id : null;
    let data = await this.modelInstance.getLatest(userId, 6);
    return this.success(data);
  }

  getPostTime(data) {
    data.update_time = think.datetime();
    /**草稿可以没有创建时间**/
    if( !data.create_time ) {
      data.create_time = data.status != 0 ? data.update_time : null;
    }else{
      data.create_time = think.datetime(data.create_time);
    }
    return data;
  }

  getContentAndSummary(data) {
    data.content = this.markdownToHtml(data.markdown_content);
    data.summary = data.content.split('<!--more-->')[0].replace(/<[>]*>/g, '');
    return data;
  }

  async getTagIds(tags) {
    if(!tags){
      return [];
    }
    if(!think.isArray(tags)){
      tags = [tags];
    }
    let modelInstance = this.model('tag').setRelation(false), tagIds = [];
    let promises = tags.map(name =>
      modelInstance.where({name}).thenAdd({name, pathname: encodeURIComponent(name)}).then(data => tagIds.push({tag_id: data.id, name: name}))
    );
    await Promise.all(promises);
    return tagIds;
  }

  /**
   * generate toc name
   * @param  {String} name []
   * @return {String}      []
   */
  generateTocName(name){
    name = name.trim().replace(/\s+/g, '').replace(/\)/g, '').replace(/[\(\,]/g, '-').toLowerCase();
    if(/^[\w\-]+$/.test(name)){
      return name;
    }
    return `toc-${think.md5(name).slice(0, 3)}`;
  }
  /**
   * markdown to html
   * @return {} []
   */
  markdownToHtml(content){
    let tocContent = marked(markToc(content)).replace(/<a\s+href="#([^\"]+)">([^<>]+)<\/a>/g, (a, b, c) => {
      return `<a href="#${this.generateTocName(c)}">${c}</a>`;
    });

    let markedContent = marked(content);
    markedContent = markedContent.replace(/<h(\d)[^<>]*>(.*?)<\/h\1>/g, (a, b, c) => {
      if(b == 2){
        return `<h${b} id="${this.generateTocName(c)}">${c}</h${b}>`;
      }
      return `<h${b} id="${this.generateTocName(c)}"><a class="anchor" href="#${this.generateTocName(c)}"></a>${c}</h${b}>`;
    });
    markedContent = markedContent.replace(/<h(\d)[^<>]*>([^<>]+)<\/h\1>/, (a, b, c) => {
      return `${a}<div class="toc">${tocContent}</div>`;
    });

    let highlightContent = markedContent.replace(/<pre><code\s*(?:class="lang-(\w+)")?>([\s\S]+?)<\/code><\/pre>/mg, (a, language, text) => {
      text = text.replace(/&#39;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/\&quot;/g, '"').replace(/\&amp;/g, "&");
      var result = highlight.highlightAuto(text, language ? [language] : undefined);
      return `<pre><code class="hljs lang-${result.language}">${result.value}</code></pre>`;
    });
    
    return highlightContent;
  }

}
