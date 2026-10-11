'use strict';
/* eslint-disable max-len */

const crypto = require('crypto');
const {marked} = require('marked');
const {createWalineCore, WalineError} = require('../vendor/waline-core.cjs');
const {ModelAdapter, UserAdapter} = require('./waline-adapter');

function signature(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

module.exports = class extends think.Service {
  async create(controller) {
    await controller.service('waline-schema').ensure();
    const options = await controller.model('options').getOptions();
    const config = options.comment || {};
    const secret = options.waline_jwt_secret;
    const users = new UserAdapter(controller.model('user'));
    const core = createWalineCore({
      models: {
        Comment: new ModelAdapter(controller.model('comment')),
        Counter: new ModelAdapter(controller.model('counter')),
        Users: users
      },
      config: {
        audit: Boolean(config.audit),
        forceLogin: Boolean(config.forceLogin),
        ipQps: Number(config.ipQps) || 60,
        normalUserType: 'guest'
      },
      logger: think.logger,
      services: {
        token: {
          sign(id) { const value = `${id}.${Date.now()}`; return `${value}.${signature(secret, value)}` },
          verify(token) {
            const parts = String(token || '').split('.');
            if (parts.length !== 3) throw new Error('invalid token');
            const value = `${parts[0]}.${parts[1]}`;
            const expected = signature(secret, value);
            if (parts[2].length !== expected.length || !crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) throw new Error('invalid token');
            return parts[0];
          }
        },
        password: {
          hash: async value => controller.model('user').getEncryptPassword(think.md5(options.password_salt + value)),
          verify: async(value, hash) => controller.model('user').checkPassword({password: hash}, think.md5(options.password_salt + value))
        },
        markdown: {render: value => marked.parse(String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;'))},
        avatar: {stringify: value => value.avatar || `https://seccdn.libravatar.org/avatar/${think.md5(String(value.mail || value.email || '').toLowerCase())}?d=mp`}
      }
    });
    return {core, users, options, config};
  }

  async context(controller, users) {
    const authorization = controller.ctx.get('authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '') || controller.get('token');
    const ctx = {
      headers: controller.ctx.headers,
      state: {token},
      ip: controller.ctx.ip,
      origin: controller.ctx.get('origin'),
      referrer: controller.ctx.referrer(),
      requestUrl: controller.ctx.url,
      serverUrl: `${controller.ctx.protocol}://${controller.ctx.host}/api/waline`
    };
    if (token) {
      const {core} = await this.create(controller);
      ctx.state.userInfo = await core.auth.resolveSession({token}, ctx);
    }
    // A Firekylin administrator session is also a Waline administrator session.
    const sessionUser = await controller.session('userInfo') || {};
    if (Number(sessionUser.type) === 1) {
      const found = await users.select({objectId: String(sessionUser.id)});
      if (found[0]) ctx.state.userInfo = found[0];
    }
    return ctx;
  }

  async validateCommentTarget(controller, url) {
    const match = String(url || '').match(/^\/(post|page)\/(.+?)(?:\.html)?\/?$/);
    if (!match) throw new WalineError('INVALID_PATH', 400, 'Comment target does not exist');
    const type = match[1] === 'page' ? 1 : 0;
    const pathname = match[2].replace(/\.html$/, '');
    const post = await controller.model('post').where({pathname, type, status: 3, is_public: 1, allow_comment: 1}).find();
    if (think.isEmpty(post)) throw new WalineError('COMMENT_DISABLED', 403, 'Comment is disabled');
    return post;
  }

  async syncCount(controller, url) {
    if (!url) return;
    const match = String(url).match(/^\/(post|page)\/(.+?)(?:\.html)?\/?$/);
    if (!match) return;
    const count = await controller.model('comment').where({url, status: ['NOT IN', ['waiting', 'spam']]}).count();
    const pathname = match[2].replace(/\.html$/, '');
    await controller.model('post').where({pathname, type: match[1] === 'page' ? 1 : 0}).update({comment_num: Number(count)});
    await think.cache('post_1', null);
  }
};
