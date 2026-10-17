const speakeasy = require('speakeasy');
const PushToFirekylin = require('../../../service/push-to-firekylin');
const Base = require('./base');
const permalink = require('../../../service/permalink');

module.exports = class extends Base {
  /**
   * 获取
   * @return {[type]} [description]
   */
  async getAction() {
    const type = this.get('type');
    const model = this.model('options');
    const options = await model.getOptions();

    if (type === '2fa') {
      if (options.two_factor_auth.length === 32) {
        return this.success({
          otpauth_url: 'otpauth://totp/firekylin?secret=' + options.two_factor_auth,
          secret: options.two_factor_auth
        });
      } else {
        const secret = speakeasy.generateSecret({
          length: 20,
          name: 'firekylin'
        });
        return this.success({
          otpauth_url: secret.otpauth_url,
          secret: secret.base32
        });
      }
    } else if (type === 'push') {
      const push_sites = await this.getPushSites();
      const result = this.get('key') ? push_sites[this.get('key')] : Object.values(push_sites);
      return this.success(result);
    } else if (type === 'defaultCategory') {
      return this.success(options.defaultCategory || '');
    }
    return this.success(options);
  }

  postAction() {
    const type = this.get('type');
    if (type === '2faAuth') {
      const data = this.post();
      const verified = speakeasy.totp.verify({
        secret: data.secret,
        encoding: 'base32',
        token: data.code,
        window: 2
      });
      return verified ? this.success() : this.fail('TWO_FACTOR_AUTH_ERROR_DETAIL');
    } else if (type === 'push') {
      const data = this.post();
      return this.setPushSites(data.appKey, data);
    }
    return super.postAction(this);
  }
  /**
   * 更新选项
   * @return {[type]} [description]
   */
  async putAction() {
    const type = this.get('type');
    const data = this.post();
    if (think.isEmpty(data)) {
      return this.fail('DATA_EMPTY');
    }

    const model = this.model('options');
    for (const key of ['post_permalink', 'page_permalink']) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        try {
          data[key] = permalink.validate(data[key]);
        } catch (error) {
          return this.fail(error.message);
        }
      }
    }
    if (type === 'push') {
      const { id, ...site } = data;
      return this.setPushSites(id, site);
    } else if (type === 'defaultCategory') {
      const result = await model.updateOptions('defaultCategory', data.id);
      this.success(result);
    } else {
      const result = await model.updateOptions(data);
      this.success(result);
    }
  }

  async deleteAction() {
    const type = this.get('type');
    if (type === 'push') {
      const key = this.get('key');
      if (think.isEmpty(key)) {
        return this.fail('KEY_EMPTY');
      }
      return this.setPushSites(key, null);
    } else {
      return super.deleteAction();
    }
  }

  async getPushSites() {
    const options = await this.model('options').getOptions();
    return options.push_sites || {};
  }

  async setPushSites(key, data) {
    const push_sites = await this.getPushSites();

    /** 新添加的 push_sites 要校验唯一性 **/
    if (!key && Object.prototype.hasOwnProperty.call(push_sites, data.appKey)) {
      return this.fail('KEY_EXIST');
    }

    /** 无论修改还是删除都把原来的删除掉 **/
    if (key) {
      delete push_sites[key];
    }

    /** 无论是新增还是修改先将新的数据添加进去 **/
    if (data) {
      /** 需要增加验证 key 正确性的请求 **/
      const {url, appKey, appSecret} = data;
      const result = await (new PushToFirekylin(url, appKey, appSecret)).authorize();
      if (result.errno) {
        return this.fail('APP_KEY_SECRET_ERROR', result.errmsg);
      }
      push_sites[data.appKey] = data;
    }

    const result = await this.model('options')
      .updateOptions('push_sites', JSON.stringify(push_sites));
    return this.success(result);
  }
};
