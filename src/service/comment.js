'use strict';
/* eslint-disable max-len */

const crypto = require('crypto');
const {marked, Renderer} = require('marked');
const {createCommentCore, CommentError} = require('../vendor/comment-core.cjs');
const {ModelAdapter, UserAdapter} = require('./comment-adapter');

function signature(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeMarkdownUrl(value, image = false) {
  let decoded = String(value || '').replace(/&colon;|&#0*58;|&#x0*3a;/ig, ':');
  try { decoded = decodeURIComponent(decoded) } catch (e) {} // eslint-disable-line no-empty
  const normalized = decoded.replace(/[\u0000-\u0020]+/g, '').toLowerCase(); // eslint-disable-line no-control-regex
  const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/);
  if (!scheme) return true;
  if (image && scheme[1] === 'data') return /^data:image\/(?:gif|png|jpe?g|webp);base64,/i.test(normalized);
  return image ? ['http', 'https'].includes(scheme[1]) : ['http', 'https', 'mailto'].includes(scheme[1]);
}

function renderMarkdown(value) {
  const renderer = new Renderer();
  renderer.link = function({href, title, tokens}) {
    const text = this.parser.parseInline(tokens);
    if (!safeMarkdownUrl(href)) return text;
    const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : '';
    return `<a href="${escapeAttribute(href)}"${titleAttribute}>${text}</a>`;
  };
  renderer.image = ({href, title, text}) => {
    if (!safeMarkdownUrl(href, true)) return escapeAttribute(text || '');
    const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : '';
    return `<img src="${escapeAttribute(href)}" alt="${escapeAttribute(text || '')}"${titleAttribute}>`;
  };
  return marked.parse(String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;'), {renderer});
}

function pathnameFromUrl(url) {
  const match = String(url || '').match(/^\/(post|page)\/(.+?)(?:\.html)?\/?$/);
  if (!match) return null;
  try {
    return {type: match[1] === 'page' ? 1 : 0, pathname: decodeURIComponent(match[2].replace(/\.html$/, ''))};
  } catch (e) {
    return null;
  }
}

function stringList(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value.split(/[\n,]/).map(item => item.trim()).filter(Boolean);
}

function wordLimit(value) {
  if (Array.isArray(value)) return [Math.max(0, Number(value[0]) || 0), Math.max(0, Number(value[1]) || 0)];
  return [0, Math.max(0, Number(value) || 0)];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = class extends think.Service {
  async create(controller) {
    const options = await controller.model('options').getOptions(true);
    const config = options.comment || {};
    const secret = options.comment_jwt_secret;
    const users = new UserAdapter(controller.model('user'));
    const tokenService = {
      sign(id) { const value = `${id}.${Date.now()}`; return `${value}.${signature(secret, value)}` },
      verify(token) {
        const parts = String(token || '').split('.');
        if (parts.length !== 3) throw new Error('invalid token');
        const value = `${parts[0]}.${parts[1]}`;
        const expected = signature(secret, value);
        if (parts[2].length !== expected.length || !crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) throw new Error('invalid token');
        return parts[0];
      }
    };
    const avatarService = {
      stringify: value => value.avatar || `https://seccdn.libravatar.org/avatar/${think.md5(String(value.mail || value.email || '').toLowerCase())}?d=mp`
    };
    const core = createCommentCore({
      models: {
        Comment: new ModelAdapter(controller.model('comment'), {hasInsertedAt: true}),
        Counter: new ModelAdapter(controller.model('counter')),
        Users: users
      },
      config: {
        audit: Boolean(config.audit),
        forceLogin: Boolean(config.forceLogin),
        ipQps: Number(config.ipQps) || 60,
        forbiddenWords: stringList(config.forbiddenWords).map(escapeRegExp),
        disallowIPList: stringList(config.disallowIPList),
        likeIncMax: Math.max(1, Math.min(100, Number(config.likeIncMax) || 1)),
        levels: stringList(config.levels)
          .map(Number)
          .filter(Number.isFinite)
          .sort((a, b) => a - b),
        avatarProxy: typeof config.avatarProxy === 'string' ? config.avatarProxy.trim() : '',
        normalUserType: 'guest'
      },
      logger: think.logger,
      services: {
        token: tokenService,
        password: {
          hash: async value => controller.model('user').getEncryptPassword(think.md5(options.password_salt + value)),
          verify: async(value, hash) => controller.model('user').checkPassword({password: hash}, think.md5(options.password_salt + value))
        },
        markdown: {render: renderMarkdown},
        avatar: avatarService
      }
    });
    return {core, users, options, config, tokenService, avatarService};
  }

  async context(controller, users, core, tokenService, avatarService) {
    const authorization = controller.ctx.get('authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '') || controller.get('token');
    const ctx = {
      headers: controller.ctx.headers,
      state: {token},
      ip: controller.ctx.ip,
      origin: controller.ctx.get('origin'),
      referrer: controller.ctx.referrer(),
      requestUrl: controller.ctx.url,
      serverUrl: `${controller.ctx.protocol}://${controller.ctx.host}/api/comment`
    };
    if (token) {
      ctx.state.userInfo = await core.auth.resolveSession({token}, ctx);
    }
    // A Firekylin administrator session is also a comment administrator session.
    const sessionUser = await controller.session('userInfo') || {};
    if (Number(sessionUser.type) === 1) {
      const found = await users.select({objectId: String(sessionUser.id)});
      if (found[0]) {
        ctx.state.userInfo = {
          ...found[0],
          avatar: await avatarService.stringify(found[0]),
          token: await tokenService.sign(found[0].objectId)
        };
      }
    }
    return ctx;
  }

  async validateCommentTarget(controller, url) {
    const target = pathnameFromUrl(url);
    if (!target) throw new CommentError('INVALID_PATH', 400, 'Comment target does not exist');
    const post = await controller.model('post').where({...target, status: 3, is_public: 1, allow_comment: 1}).find();
    if (think.isEmpty(post)) throw new CommentError('COMMENT_DISABLED', 403, 'Comment is disabled');
    return post;
  }

  validateCommentInput(input, ctx, config, requireMeta = true) {
    const data = input && input.data && typeof input.data === 'object' ? input.data : input;
    if (Object.prototype.hasOwnProperty.call(data, 'comment')) {
      const content = String(data.comment || '');
      const length = Array.from(content).length;
      const [min, max] = wordLimit(config.wordLimit);
      if ((min && length < min) || (max && length > max)) {
        throw new CommentError('VALIDATION_ERROR', 400, 'COMMENT_LENGTH', {field: 'comment', min, max});
      }
    }
    if (requireMeta && !ctx.state.userInfo) {
      const required = stringList(config.requiredMeta).filter(item => ['nick', 'mail', 'link'].includes(item));
      const missing = required.find(field => !String(data[field] || '').trim());
      if (missing) throw new CommentError('VALIDATION_ERROR', 400, 'REQUIRED_META', {field: missing});
    }
  }

  async syncCount(controller, url) {
    if (!url) return;
    const target = pathnameFromUrl(url);
    if (!target) return;
    const count = await controller.model('comment').where({url, status: ['NOT IN', ['waiting', 'spam']]}).count();
    await controller.model('post').where(target).update({comment_num: Number(count)});
    await think.cache('post_1', null);
  }
};

module.exports.renderMarkdown = renderMarkdown;
module.exports.pathnameFromUrl = pathnameFromUrl;
