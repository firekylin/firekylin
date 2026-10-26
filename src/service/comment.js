'use strict';
/* eslint-disable max-len */

const crypto = require('crypto');
const MarkdownIt = require('markdown-it');
const {createCommentCore, CommentError} = require('../vendor/comment-core.cjs');
const adminAuth = require('./admin-auth');
const {ModelAdapter, CommentAdapter, UserAdapter} = require('./comment-adapter');
const permalink = require('./permalink');

const tasklistPlugin = import('@mdit/plugin-tasklist').then(module => module.tasklist);

function signature(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function safeMarkdownUrl(value, image = false) {
  let decoded = String(value || '').replace(/&colon;|&#0*58;|&#x0*3a;/ig, ':');
  try { decoded = decodeURIComponent(decoded) } catch {} // eslint-disable-line no-empty
  const normalized = decoded.replace(/[\u0000-\u0020]+/g, '').toLowerCase(); // eslint-disable-line no-control-regex
  const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/);
  if (!scheme) return true;
  if (image && scheme[1] === 'data') return /^data:image\/(?:gif|png|jpe?g|webp);base64,/i.test(normalized);
  return image ? ['http', 'https'].includes(scheme[1]) : ['http', 'https', 'mailto'].includes(scheme[1]);
}

async function renderMarkdown(value) {
  const markdown = new MarkdownIt({html: false, linkify: true});
  markdown.use(await tasklistPlugin);
  markdown.validateLink = () => true;
  let unsafeLinkDepth = 0;
  markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href');
    if (!safeMarkdownUrl(href)) {
      unsafeLinkDepth++;
      return '';
    }
    return self.renderToken(tokens, idx, options);
  };
  markdown.renderer.rules.link_close = () => {
    if (!unsafeLinkDepth) return '</a>';
    unsafeLinkDepth--;
    return '';
  };
  const renderImage = markdown.renderer.rules.image;
  markdown.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (!safeMarkdownUrl(token.attrGet('src'), true)) return markdown.utils.escapeHtml(token.content);
    return renderImage(tokens, idx, options, env, self);
  };
  return markdown.render(String(value));
}

function pathnameFromUrl(url, options) {
  const match = String(url || '').match(/^\/(post|page)\/(.+?)(?:\.html)?\/?$/);
  if (match) {
    try {
      return {type: match[1] === 'page' ? 1 : 0, pathname: decodeURIComponent(match[2].replace(/\.html$/, ''))};
    } catch {
      return null;
    }
  }
  const candidates = permalink.match(String(url || '').split(/[?#]/, 1)[0], options);
  if (candidates.length !== 1 || !candidates[0].params.slug) return null;
  return {type: candidates[0].type, pathname: candidates[0].params.slug};
}

async function resolveCommentPostId(controller, url, options) {
  const target = pathnameFromUrl(url, options);
  let post = target ? await controller.model('post').where({...target, status: 3, is_public: 1})
    .field('id')
    .find() : {};
  if (think.isEmpty(post)) {
    for (const candidate of permalink.match(String(url || '').split(/[?#]/, 1)[0], options)) {
      const where = candidate.params.slug
        ? {type: candidate.type, pathname: candidate.params.slug}
        : {type: candidate.type, id: Number(candidate.params.id) || 0};
      const found = await controller.model('post').where({...where, status: 3, is_public: 1})
        .field('id')
        .find();
      if (!think.isEmpty(found)) {
        if (!think.isEmpty(post) && post.id !== found.id) return null;
        post = found;
      }
    }
  }
  return post && post.id ? Number(post.id) : null;
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
    const secret = options.jwt_secret || options.comment_jwt_secret;
    const users = new UserAdapter(controller.model('user'));
    const postIds = new Map();
    const resolvePostId = async url => {
      if (postIds.has(url)) return postIds.get(url);
      const id = await resolveCommentPostId(controller, url, options);
      postIds.set(url, id);
      return id;
    };
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
        Comment: new CommentAdapter(controller.model('comment'), resolvePostId),
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

  async context(controller, users, core, tokenService, avatarService, bootstrapAdmin = false) {
    const authorization = controller.ctx.get('authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '') || controller.get('token');
    const ctx = {
      headers: controller.ctx.headers,
      state: {token},
      ip: controller.ctx.ip,
      origin: controller.ctx.get('origin'),
      referrer: controller.ctx.referrer(),
      requestUrl: controller.ctx.state.originalPermalink || controller.ctx.url,
      serverUrl: `${controller.ctx.protocol}://${controller.ctx.host}/api/comment`
    };
    ctx.state.oauthServices = [];
    if (token) {
      ctx.state.userInfo = await core.auth.resolveSession({token}, ctx);
    }
    // Only explicit session bootstrap may exchange the administrator Cookie for a comment token.
    const sessionUser = adminAuth.currentUser(controller.ctx) || {};
    if (bootstrapAdmin && !token && !think.isEmpty(sessionUser)) {
      const found = await users.select({objectId: String(sessionUser.id), type: ['!=', 'banned']});
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
    const options = await controller.model('options').getOptions();
    const direct = pathnameFromUrl(url, options);
    const targets = direct ? [direct] : permalink.match(String(url || '').split(/[?#]/, 1)[0], options)
      .map(candidate => candidate.params.slug ? {type: candidate.type, pathname: candidate.params.slug} : {
        type: candidate.type, id: Number(candidate.params.id) || 0
      });
    if (!targets.length) throw new CommentError('INVALID_PATH', 400, 'Comment target does not exist');
    let post = {};
    for (const target of targets) {
      const current = await controller.model('post').where({
        ...target, status: 3, is_public: 1, allow_comment: 1
      }).find();
      if (!think.isEmpty(current)) {
        if (!think.isEmpty(post) && post.id !== current.id) {
          throw new CommentError('INVALID_PATH', 409, 'Comment target is ambiguous');
        }
        post = current;
      }
    }
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

  async syncCount(controller, target) {
    if (!target) return;
    let postId = Number(target.post_id || target.id || target);
    if (!postId && typeof target === 'string') {
      const options = await controller.model('options').getOptions();
      const path = pathnameFromUrl(target, options);
      const post = path ? await controller.model('post').where(path)
        .field('id')
        .find() : {};
      postId = Number(post.id);
    }
    if (!postId) return;
    const count = await controller.model('comment').where({post_id: postId, status: ['NOT IN', ['waiting', 'spam']]}).count();
    await controller.model('post').where({id: postId}).update({comment_num: Number(count)});
    await think.cache('post_1', null);
  }
};

module.exports.renderMarkdown = renderMarkdown;
module.exports.pathnameFromUrl = pathnameFromUrl;
module.exports.resolveCommentPostId = resolveCommentPostId;
