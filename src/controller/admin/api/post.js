const PushToFirekylin = require('../../../service/push-to-firekylin');
const dayjs = require('dayjs');
const Base = require('./base');
const PostQueryService = require('../../../service/post-query');
const PostCommandService = require('../../../service/post-command');
const permalink = require('../../../service/permalink');

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
      data.options.passwordProtected = Boolean(data.options.postPasswordHash);
      delete data.options.postPasswordHash;
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

  async runCommand(operation) {
    try { return await operation() } catch (error) {
      const failures = {
        PATHNAME_EXIST: 'PATHNAME_EXIST',
        'Post not found or permission denied': 'USER_NO_PERMISSION',
        'Authenticated author required': 'USER_NO_PERMISSION',
        'Invalid post ID': 'PARAMS_ERROR'
      };
      if (Object.hasOwn(failures, error.message)) return this.fail(failures[error.message]);
      throw error;
    }
  }

  commandService() {
    return new PostCommandService({
      getModel: () => this.model('post'),
      now: () => think.datetime()
    });
  }

  getBaseAction(self) {
    return super.getAction(self);
  }
  /**
   * add user
   * @return {[type]} [description]
   */
  async postAction() {
    return this.runCommand(async() => {
      const data = await this.prepareProtection(this.post());
      const result = await this.commandService().create(data, this.userInfo, {
        getTagModel: () => this.model('tag')
      });
      // Preserve existing push integration, but do not block persistence on a remote service.
      if (data.options && data.markdown_content) void this.pushPost(data).catch(error => think.logger.error(error));
      return this.success(result);
    });
  }
  /**
   * update user info
   * @return {[type]} [description]
   */
  async putAction() {
    return this.runCommand(async() => {
      if (!this.id) return this.fail('PARAMS_ERROR');
      const data = {...this.post(), id: Number(this.id)};
      const result = await this.commandService().update(data, this.userInfo, {
        getTagModel: () => this.model('tag'),
        prepare: (next, post) => this.prepareProtection(next, post.options),
        normalizePublishTime: (next, post) => {
          let options = JSON.parse(post.options || '{}');
          if (typeof options === 'string') options = JSON.parse(options) || {};
          if (dayjs(next.create_time).isBefore(dayjs()) && !options.origin_create_time) {
            next.options = JSON.stringify({...options, origin_create_time: next.create_time});
            next.create_time = think.datetime();
          } else {
            delete next.create_time;
          }
          return next;
        }
      });
      if (data.markdown_content && data.options) void this.pushPost(data).catch(error => think.logger.error(error));
      return this.success({affectedRows: result.affectedRows});
    });
  }

  async deleteAction() {
    return this.runCommand(async() => {
      if (!this.id) return this.fail('PARAMS_ERROR');
      await this.commandService().remove(Number(this.id), this.userInfo);
      return this.success();
    });
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
      const site_url = Object.prototype.hasOwnProperty.call(options, 'site_url')
        ? options.site_url
        : `http://${this.ctx.host}`;
      post.markdown_content = `> 原文：${site_url}${permalink.generate('post', post, options)}

${post.markdown_content}`;
    }

    delete post.id;
    delete post.cate;
    delete post.user_id;
    post.options = JSON.stringify({
      featuredImage: postOpt.featuredImage,
      fields: postOpt.fields || {}
    });

    if (!Array.isArray(push_sites_keys)) { push_sites_keys = [push_sites_keys] }
    const pushes = push_sites_keys.map(key => {
      const {appKey, appSecret, url} = push_sites[key];
      const p2fk = new PushToFirekylin(url, appKey, appSecret);
      return p2fk.push(post);
    });
    const result = await Promise.all(pushes);
    console.log('push result for debug: ', result); // eslint-disable-line no-console
  }

  async prepareProtection(data, existingOptions = '{}') {
    let current = {};
    try { current = JSON.parse(existingOptions || '{}') || {} } catch { current = {} }
    let incoming = {};
    try { incoming = JSON.parse(data.options || '{}') || {} } catch { incoming = {} }
    delete incoming.passwordProtected;
    delete incoming.postPasswordHash;
    const options = Object.assign({}, current, incoming);
    if (typeof data.post_password === 'string' && data.post_password.length > 256) {
      throw new Error('Post password is too long');
    }
    if (data.clear_post_password === '1' || data.clear_post_password === 1) {
      delete options.postPasswordHash;
    } else if (data.post_password) {
      options.postPasswordHash = await this.service('post-protection').hash(data.post_password);
    }
    delete data.post_password;
    delete data.clear_post_password;
    data.options = JSON.stringify(options);
    return data;
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
