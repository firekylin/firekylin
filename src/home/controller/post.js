'use strict';

import Base from './base.js';
import fs from 'fs';


export default class extends Base {
  /**
   * index action
   * @return {[type]} [description]
   */
  indexAction(){
    return this.listAction();
  }
  /**
   * post list
   * @return {Promise} []
   */
  async listAction(){
    let model = this.model('post');
    let where = {
      tag: this.get('tag'),
      cate: this.get('cate')
    };
    if( this.get('name') ) {
      let user = await this.model('user').where({name: this.get('name')}).find();
      if( !think.isEmpty(user) ) {
        where.where = {user_id: user.id};
      }
    }

    let list = await model.getPostList(this.get('page'), where);
    this.assign('tag', this.get('tag'));
    this.assign('cate', this.get('cate'));
    this.assign('postList', list);
    return this.displayView('list');
  }
  /**
   * post detail
   * @return {[type]} [description]
   */
  async detailAction(){
    this.http.url = decodeURIComponent(this.http.url);
    let pathname = this.get('pathname');
    let detail = await this.model('post').getPostDetail(pathname);
    if(think.isEmpty(detail)){
      return this.redirect('/');
    }
    this.assign(detail);

    return this.displayView('detail');
  }

  async pageAction(){
    let pathname = this.get('pathname');
    let detail = await this.model('post').setRelation(false).where({
      pathname: pathname,
      is_public: 1, //公开
      type: 1, //文章
      status: 3 //已经发布
    }).find();
    this.assign('page', detail);
    this.assign('pathname', pathname);

    return this.displayView('page');
  }
  /**
   * post archive
   * @return {[type]} [description]
   */
  async archiveAction(){
    let model = this.model('post');
    let data = await model.getPostArchive();
    this.assign('list', data);
    return this.displayView('archive');
  }

  async tagAction(){
    let model = this.model('tag');
    let data = await model.getTagArchive();
    this.assign('list', data);
    return this.displayView('tag');
  }
  /**
   * search action
   * @return {[type]} [description]
   */
  async searchAction(){
    let keyword = this.get('keyword').trim();
    if(keyword){
      let postModel = this.model('post');
      let searchResultPromise = postModel.getPostSearch(keyword, this.get('page'));
      this.assign('searchData', searchResultPromise);
    }

    //热门标签
    let tagModel = this.model('tag');
    let hotTagsPromise = tagModel.getHotTags();
    this.assign('hotTags', hotTagsPromise);


    this.assign('keyword', keyword);
    return this.displayView('search');
  }
}
