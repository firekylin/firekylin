const push2Firekylin = require('push-to-firekylin');
const moment = require('moment');
const Base = require('./base');

module.exports = class extends Base {
  constructor(...args) {
    super(...args);
    this._modelInstance = this.modelInstance;
    Object.defineProperty(this, 'modelInstance', {
      get() {
        return this._modelInstance.where({type: 0})
      }
    })
  }
  /**
   * get
   * @return {[type]} [description]
   */
  async getAction() {
    // this.modelInstance.field('id,user_id,type,status,title,pathname,create_time,update_time');
    if(this.get('type') === 'lastest') {
      return this.lastest();
    }

    let data;
    if(this.id) {
      data = await this.modelInstance.where({id: this.id}).find();
      //文章选项
      if(data.options) {
        data.options = JSON.parse(data.options) || {};
      }else{
        data.options = {};
      }
    } else {
      let where = {};
      //不是管理员，只显示个人的文章
      if(this.userInfo.type !== 1) {
        where.user_id = this.userInfo.id;
      }

      if(this.get('status')) {
        where.status = this.get('status');
      }

      if(this.get('keyword')) {
        let keywords = this.get('keyword').split(/\s+/g);
        if(keywords.indexOf(':public') > -1 || keywords.indexOf(':private') > -1) {
          where.is_public = Number(keywords.indexOf(':public') > -1);
          keywords = keywords.filter(word => word !== ':public' && word !== ':private');
        }
        if(keywords.length > 0) {
          where.title = ['like', keywords.map(word => `%${word}%`)];
        }
      }

      if(this.get('cate')) {
        let cate = parseInt(this.get('cate'));
        if(!isNaN(cate)) {
          this.modelInstance.join({
            table: 'post_cate',
            join: 'left',
            on: ['id', 'post_id']
          });
          where.cate_id = cate;
        }
      }

      let field = [
        `${this.modelInstance.config.prefix}post.id`,
        'title',
        'user_id',
        'create_time',
        'update_time',
        'status',
        'pathname',
        'is_public'
      ];
      data = await this.modelInstance.where(where)
        .field(field)
        .order('create_time DESC')
        .page(this.get('page'), 15)
        .countSelect();
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
  async postAction() {
    let data = this.post();
    //check pathname
    let post = await this.modelInstance.where({pathname: data.pathname}).find();
    if(!think.isEmpty(post)) {
      return this.fail('PATHNAME_EXIST');
    }

    /** 如果是编辑发布文章的话默认状态改为审核中 **/
    if(data.status === 3 && this.userInfo.type !== 1) {
      data.status = 1;
    }

    /** 推送文章 **/
    this.pushPost(data);

    data.tag = await this.getTagIds(data.tag);
    data = await this.modelInstance.getContentAndSummary(data);
    data.user_id = this.userInfo.id;
    data = this.modelInstance.getPostTime(data);

    let insert = await this.modelInstance.addPost(data);
    return this.success(insert);
  }
  /**
   * update user info
   * @return {[type]} [description]
   */
  async putAction() {
    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }

    let data = this.post();
    data.id = this.id;

    /** 判断接收的参数中是否有 markdown_content 来区别审核通过的状态修改和普通的文章更新 */
    if(data.markdown_content) {
      if(this.userInfo.type !== 1) {
        let post = await this.modelInstance.where({id: this.id}).find();
        if(post.user_id !== this.userInfo.id) {
          return this.fail('USER_NO_PERMISSION');
        }
      }

      /** 如果是编辑发布文章的话默认状态改为审核中 **/
      if(data.status === 3 && this.userInfo.type !== 1) {
        data.status = 1;
      }

      /** 推送文章 */
      this.pushPost(data);

      data = this.modelInstance.getPostTime(data);
      data = await this.modelInstance.getContentAndSummary(data);
      if(data.tag) {
        data.tag = await this.getTagIds(data.tag);
      }
    } else if (data.create_time) {
      /** 审核通过的状态修改，有 create_time 即需要更新时间，时间由服务器生成 */

      const post = await this.modelInstance.where({id: data.id}).find();
      let options = JSON.parse(post.options || '{}');
      if (typeof options === 'string') {
        options = JSON.parse(options) || {};
      }

      if (moment(data.create_time) < moment() && !options.origin_create_time) {

        data.options = JSON.stringify({
          ...options,
          origin_create_time: data.create_time
        });
        data.create_time = think.datetime(); // 此处可能出现 create_time 和 update_time 不一致的情况
      } else {
        // 此处需删除 create_time，或者对 create_time 的格式进行处理
        delete data.create_time;
      }
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
      if(post.user_id !== this.userInfo.id) {
        return this.fail('USER_NO_PERMISSION');
      }
    }

    await this.modelInstance.deletePost(this.id);
    return this.success();
  }

  async pushPost(postData) {
    let post = Object.assign({}, postData);
    let postOpt = JSON.parse(post.options);
    let canPush = Array.isArray(postOpt.push_sites) && postOpt.push_sites.length > 0;
    if(post.status !== 3 && post.is_public !== 1 && !canPush) {
      return;
    }
    post = think.extend({}, post);

    let options = await this.model('options').getOptions();
    let push_sites = options.push_sites;
    let push_sites_keys = postOpt.push_sites;

    if(post.markdown_content.slice(0, 5) !== '> 原文：') {
      let site_url = options.hasOwnProperty('site_url') ? options.site_url : `http://${this.ctx.host}`;
      post.markdown_content = `> 原文：${site_url}/post/${post.pathname}.html

${post.markdown_content}`;
    }

    delete post.id;
    delete post.cate;
    delete post.user_id;
    post.options = JSON.stringify({
      featuredImage: postOpt.featuredImage
    });

    if(!Array.isArray(push_sites_keys)) { push_sites_keys = [push_sites_keys]; }
    let pushes = push_sites_keys.map(key => {
      let {appKey, appSecret, url} = push_sites[key];
      let p2fk = new push2Firekylin(url, appKey, appSecret);
      return p2fk.push(post);
    });
    let result = await Promise.all(pushes);
    console.log('push result for debug: ', result); // eslint-disable-line no-console
  }

  async lastest() {
    let userId = this.userInfo.type !== 1 ? this.userInfo.id : null;
    let data = await this.modelInstance.getLatest(userId, 6);
    return this.success(data);
  }

  getPostTime(data) {
    data.update_time = think.datetime();
    if(!data.create_time) {
      data.create_time = data.update_time;
    }else{
      data.create_time = think.datetime(data.create_time);
    }
    return data;
  }


  async getTagIds(tags) {
    if(!tags) {
      return [];
    }
    if(!think.isArray(tags)) {
      tags = [tags];
    }
    let modelInstance = this.model('tag').setRelation(false), tagIds = [];
    let promises = tags.map(name =>
      modelInstance.where({name})
        .thenAdd({name, pathname: name})
        .then(data => tagIds.push({tag_id: data.id, name: name}))
    );
    await Promise.all(promises);
    return tagIds;
  }
}
