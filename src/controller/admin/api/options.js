const captcha = require('../../../service/captcha');
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
    if (Number(this.userInfo.type) === 1) options.captcha = captcha.settings(await model.getOptions(true));

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

  async postAction() {
    const type = this.get('type');
    if (type === 'testCommentMail') {
      const {config = {}, recipient} = this.post();
      if (!config || typeof config !== 'object' || Array.isArray(config)) return this.fail('PARAMS_ERROR');
      const options = await this.model('options').getOptions(true);
      const saved = options.comment || {};
      try {
        await require('../../../service/comment').sendTestEmail({
          ...saved, ...config, smtpPass: config.smtpPass || saved.smtpPass || ''
        }, recipient, options);
        return this.success({message: '测试邮件已提交给邮件服务器，请检查收件箱'});
      } catch (error) { return this.fail('MAIL_TEST_FAILED', error.message) }
    }
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
    if (Object.prototype.hasOwnProperty.call(data, 'comment')) {
      let comment;
      try {
        comment = typeof data.comment === 'string' ? JSON.parse(data.comment) : data.comment;
        if (!comment || typeof comment !== 'object' || Array.isArray(comment)) throw new Error();
      } catch { return this.fail('PARAMS_ERROR') }
      const previous = (await model.getOptions(true)).comment || {};
      for (const key of ['smtpPass']) {
        if (comment[key] !== undefined && typeof comment[key] !== 'string') return this.fail('PARAMS_ERROR');
        if (!comment[key]) comment[key] = previous[key] || '';
      }
      for (const [key, max] of [['mailSubjectTemplate', 500], ['mailBodyTemplate', 20000]]) {
        if (comment[key] !== undefined && (typeof comment[key] !== 'string' || comment[key].length > max)) {
          return this.fail('邮件模板格式错误或长度超出限制');
        }
      }
      const port = Number(comment.smtpPort);
      if (comment.smtpPort && (!Number.isInteger(port) || port < 1 || port > 65535)) {
        return this.fail('PARAMS_ERROR');
      }
      data.comment = JSON.stringify({...previous, ...comment});
    }
    if (Object.prototype.hasOwnProperty.call(data, 'captcha')) {
      let config;
      try {
        config = typeof data.captcha === 'string' ? JSON.parse(data.captcha) : data.captcha;
        if (!config || !['none', 'turnstile', 'recaptcha-v3'].includes(config.provider) ||
          !Array.isArray(config.areas) || config.areas.some(area => !['login', 'comment'].includes(area)) ||
          !['auto', 'light', 'dark'].includes(config.theme) ||
          typeof config.language !== 'string' || !/^[a-zA-Z-]{2,20}$/.test(config.language) ||
          typeof config.siteKey !== 'string' || typeof config.secret !== 'string') throw new Error();
        config = {...captcha.publicSettings(config), secret: config.secret};
        if (config.provider !== 'none' && config.areas.length && (!config.siteKey || !config.secret)) throw new Error();
      } catch { return this.fail('验证码配置不完整或格式错误') }
      data.captcha = JSON.stringify(config);
    }
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
