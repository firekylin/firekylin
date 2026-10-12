const push2Firekylin = require('push-to-firekylin');
const dayjs = require('dayjs');
const Base = require('./base');
const PostQueryService = require('../../../service/post-query');

module.exports = class extends Base {
  constructor(...args) {
    super(...args);
    this._modelInstance = this.modelInstance;
    Object.defineProperty(this, 'modelInstance', {
      get() {
        return this._modelInstance.where({type: 0});
      }
    });
  }
  /**
   * get
   * @return {[type]} [description]
   */
  async getAction() {
    if (this.get('type') === 'lastest') return this.lastest();

    const service = new PostQueryService({
      getModel: () => this.model('post'),
      now: () => think.datetime()
    });
    let data;
    if (this.id) {
      data = await service.getAdmin(this.id, this.userInfo);
      if (!data || !data.id) return this.fail('USER_NO_PERMISSION');
      data.options = data.options ? JSON.parse(data.options) || {} : {};
    } else {
      const {status, keyword, cate} = this.get();
      const requestedPageSize = Number(this.get('pageSize'));
      const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0
        ? Math.min(requestedPageSize, 100)
        : 15;
      data = await service.listAdmin({
        userInfo: this.userInfo, status, keyword, cate,
        page: this.get('page'), pageSize
      });
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
    // check pathname
    const post = await this.modelInstance.where({pathname: data.pathname}).find();
    if (!think.isEmpty(post)) {
      return this.fail('PATHNAME_EXIST');
    }

    /** 如果是编辑发布文章的话默认状态改为审核中 **/
    if (data.status === 3 && this.userInfo.type !== 1) {
      data.status = 1;
    }

    /** 推送文章 **/
    this.pushPost(data);

    data.tag = await this.getTagIds(data.tag);
    data = await this.modelInstance.getContentAndSummary(data);
    data.user_id = this.userInfo.id;
    data = this.modelInstance.getPostTime(data);

    const insert = await this.modelInstance.addPost(data);
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
    if (data.markdown_content) {
      if (this.userInfo.type !== 1) {
        const post = await this.modelInstance.where({id: this.id}).find();
        if (post.user_id !== this.userInfo.id) {
          return this.fail('USER_NO_PERMISSION');
        }
      }

      /** 如果是编辑发布文章的话默认状态改为审核中 **/
      if (data.status === 3 && this.userInfo.type !== 1) {
        data.status = 1;
      }

      /** 推送文章 */
      this.pushPost(data);

      data = this.modelInstance.getPostTime(data);
      data = await this.modelInstance.getContentAndSummary(data);
      if (data.tag) {
        data.tag = await this.getTagIds(data.tag);
      }
    } else if (data.create_time) {
      /** 审核通过的状态修改，有 create_time 即需要更新时间，时间由服务器生成 */

      const post = await this.modelInstance.where({id: data.id}).find();
      let options = JSON.parse(post.options || '{}');
      if (typeof options === 'string') {
        options = JSON.parse(options) || {};
      }

      if (dayjs(data.create_time).isBefore(dayjs()) && !options.origin_create_time) {
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

    const rows = await this.modelInstance.savePost(data);
    return this.success({affectedRows: rows});
  }

  async deleteAction() {
    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }

    /** 如果不是管理员且不是本文作者则无权限删除文章 **/
    if (this.userInfo.type !== 1) {
      const post = await this.modelInstance.where({id: this.id}).find();
      if (post.user_id !== this.userInfo.id) {
        return this.fail('USER_NO_PERMISSION');
      }
    }

    await this.modelInstance.deletePost(this.id);
    return this.success();
  }

  async pushPost(postData) {
    let post = Object.assign({}, postData);
    const postOpt = JSON.parse(post.options);
    const canPush = Array.isArray(postOpt.push_sites) && postOpt.push_sites.length > 0;
    if (post.status !== 3 && post.is_public !== 1 && !canPush) {
      return;
    }
    post = think.extend({}, post);

    const options = await this.model('options').getOptions();
    const push_sites = options.push_sites;
    let push_sites_keys = postOpt.push_sites;

    if (post.markdown_content.slice(0, 5) !== '> 原文：') {
      const site_url = options.hasOwnProperty('site_url') ? options.site_url : `http://${this.ctx.host}`;
      post.markdown_content = `> 原文：${site_url}/post/${post.pathname}.html

${post.markdown_content}`;
    }

    delete post.id;
    delete post.cate;
    delete post.user_id;
    post.options = JSON.stringify({
      featuredImage: postOpt.featuredImage
    });

    if (!Array.isArray(push_sites_keys)) { push_sites_keys = [push_sites_keys] }
    const pushes = push_sites_keys.map(key => {
      const {appKey, appSecret, url} = push_sites[key];
      const p2fk = new push2Firekylin(url, appKey, appSecret);
      return p2fk.push(post);
    });
    const result = await Promise.all(pushes);
    console.log('push result for debug: ', result); // eslint-disable-line no-console
  }

  async lastest() {
    const userId = this.userInfo.type !== 1 ? this.userInfo.id : null;
    const data = await this.modelInstance.getLatest(userId, 6);
    return this.success(data);
  }

  getPostTime(data) {
    data.update_time = think.datetime();
    if (!data.create_time) {
      data.create_time = data.update_time;
    } else {
      data.create_time = think.datetime(data.create_time);
    }
    return data;
  }

  async getTagIds(tags) {
    if (!tags) {
      return [];
    }
    if (!think.isArray(tags)) {
      tags = [tags];
    }
    const modelInstance = this.model('tag').setRelation(false); const tagIds = [];
    const promises = tags.map(name =>
      modelInstance.where({name})
        .thenAdd({name, pathname: name})
        .then(data => tagIds.push({tag_id: data.id, name: name}))
    );
    await Promise.all(promises);
    return tagIds;
  }
};
