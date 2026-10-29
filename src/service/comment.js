'use strict';
/* eslint-disable max-len */

const captcha = require('./captcha');
const crypto = require('crypto');
const MarkdownIt = require('markdown-it');
const {createCommentCore, CommentError} = require('../vendor/comment-core.cjs');
const adminAuth = require('./admin-auth');
const {ModelAdapter, CommentAdapter, UserAdapter} = require('./comment-adapter');
const parseUserAgent = require('ua-parser-js');
const permalink = require('./permalink');
const {emit, filterStrict} = require('../plugin/runtime');

const tasklistPlugin = import('@mdit/plugin-tasklist').then(module => module.tasklist);

function smtpSettings(config, options, env = process.env) {
  env = {
    ...env,
    SMTP_HOST: config.smtpHost || env.SMTP_HOST,
    SMTP_PORT: config.smtpPort || env.SMTP_PORT,
    SMTP_SECURE: typeof config.smtpSecure === 'boolean' ? String(config.smtpSecure) : env.SMTP_SECURE,
    SMTP_USER: config.smtpUser || env.SMTP_USER,
    SMTP_PASS: config.smtpPass || env.SMTP_PASS,
    SMTP_FROM: config.smtpFrom || env.SMTP_FROM,
    AUTHOR_EMAIL: config.authorEmail || env.AUTHOR_EMAIL
  };
  return env;
}

function mailTransport(env, mailer) {
  return env.SMTP_HOST && (mailer || require('nodemailer')).createTransport({
    host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 465, secure: env.SMTP_SECURE !== 'false',
    auth: env.SMTP_USER ? {user: env.SMTP_USER, pass: env.SMTP_PASS} : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000
  });
}

const DEFAULT_MAIL_SUBJECT = '[{{siteName}}] {{type}}';
const DEFAULT_MAIL_BODY = '{{nick}}：\n{{comment}}\n\n{{url}}';

function renderNotificationMail(config, options, comment, parent, recipient, type) {
  const values = {
    siteName: options.title || 'Firekylin', siteUrl: options.site_url || '', type,
    nick: comment.nick || '访客', comment: comment.rawComment || comment.comment || '',
    parentNick: parent && parent.nick || '', parentComment: parent && parent.comment || '',
    url: comment.url || options.site_url || '', recipient, status: comment.status || ''
  };
  const render = template => template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match);
  const subject = config.mailSubjectTemplate || DEFAULT_MAIL_SUBJECT;
  const body = config.mailBodyTemplate || DEFAULT_MAIL_BODY;
  if (typeof subject !== 'string' || subject.length > 500 || typeof body !== 'string' || body.length > 20000) {
    throw new Error('邮件标题模板最多 500 字符，正文模板最多 20000 字符');
  }
  return {subject: render(subject).replace(/[\r\n]+/g, ' '), text: render(body)};
}

function notificationServices(config, options, env = process.env, mailer, resolveUser) {
  env = smtpSettings(config, options, env);
  const services = {};
  if (config.mailNotify) {
    const transport = mailTransport(env, mailer);
    services.notification = {
      async send(comment, parent, approvedReply = false) {
        if (!transport || !env.SMTP_FROM) {
          think.logger.error('Comment mail requires SMTP_HOST and SMTP_FROM');
          return;
        }
        try {
          const resolveAuthor = async value => {
            if (!value || !value.user_id || !resolveUser) return value;
            const user = await resolveUser(value.user_id);
            return user && user.email ? {...value, mail: user.email, nick: user.display_name || user.name || value.nick} : value;
          };
          [comment, parent] = await Promise.all([resolveAuthor(comment), resolveAuthor(parent)]);
        } catch {
          think.logger.error('Comment notification author lookup failed');
          return;
        }
        const recipients = new Set();
        if (!approvedReply && env.AUTHOR_EMAIL) recipients.add(env.AUTHOR_EMAIL);
        if (comment.status === 'approved' && parent && parent.mail && parent.mail.toLowerCase() !== String(comment.mail || '').toLowerCase() &&
          !(parent.user_id && comment.user_id && String(parent.user_id) === String(comment.user_id))) {
          recipients.add(parent.mail);
        }
        let url;
        try {
          url = new URL(comment.url, options.site_url);
          if (url.origin !== new URL(options.site_url).origin) return;
        } catch { return }
        for (const to of recipients) {
          try {
            await transport.sendMail({
              from: env.SMTP_FROM, to,
              ...renderNotificationMail(config, options, {...comment, url: url.href}, parent, to,
                parent ? '评论有新回复' : '收到新评论')
            });
          } catch {
            think.logger.error('Comment notification delivery failed');
          }
        }
      }
    };
  }
  return services;
}

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
      let id = await resolveCommentPostId(controller, url, options);
      if (id) {
        const post = await controller.model('post').where({id}).field('id,options')
          .find();
        if (!this.canAccessProtectedComments(controller, post)) id = null;
      }
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
    let filteredUpdate;
    const commentModel = new CommentAdapter(controller.model('comment'), resolvePostId);
    const updateComment = commentModel.update.bind(commentModel);
    commentModel.update = (data, where) => {
      const patch = filteredUpdate;
      filteredUpdate = undefined;
      if (patch) Object.assign(data, patch);
      return updateComment(data, where);
    };
    const core = createCommentCore({
      hooks: {
        async preSave(data, _parent, ctx) {
          const next = await filterStrict('comment.beforeCreate', data, {ctx});
          if (!next || typeof next !== 'object' || Array.isArray(next)) throw new TypeError('Invalid comment filter result');
          Object.assign(data, next);
        },
        postSave: (comment, parent, ctx) => emit('comment.created', {comment, parent, ctx}),
        preUpdate: (data, _extra, ctx) => filterStrict('comment.beforeUpdate', data, {ctx}).then(next => {
          if (!next || typeof next !== 'object' || Array.isArray(next)) throw new TypeError('Invalid comment filter result');
          const {objectId, ...patch} = next;
          filteredUpdate = patch;
        }),
        postUpdate: (data, _extra, ctx) => emit('comment.updated', {data, ctx}),
        preDelete: (id, _extra, ctx) => filterStrict('comment.beforeDelete', id, {ctx}).then(() => undefined),
        postDelete: (id, _extra, ctx) => emit('comment.deleted', {id, ctx})
      },
      models: {
        Comment: commentModel,
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
        ...(captcha.enabled(captcha.settings(options), 'comment') ? {captcha: {verify: (token, ctx) => captcha.verify(captcha.settings(options), token, ctx.ip, 'comment')}} : {}),
        ...notificationServices(config, options, process.env, undefined,
          id => controller.model('user').where({id}).field('email,name,display_name')
            .find()),
        token: tokenService,
        password: {
          hash: async value => controller.model('user').getEncryptPassword(think.md5(options.password_salt + value)),
          verify: async(value, hash) => controller.model('user').checkPassword({password: hash}, think.md5(options.password_salt + value))
        },
        markdown: {render: renderMarkdown},
        userAgent: {parse: parseUserAgent},
        avatar: avatarService
      }
    });
    return {core, users, options, config, tokenService, avatarService, resolvePostId};
  }

  canAccessProtectedComments(controller, post) {
    if (!post || !post.id) return false;
    let options = post.options || {};
    if (typeof options === 'string') {
      try { options = JSON.parse(options) || {} } catch { return false }
    }
    if (!options.postPasswordHash) return true;
    return controller.service('post-protection').hasCommentAccess(controller.ctx, {...post, options});
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
      requestUrl: controller.ctx.state.originalPermalink || controller.ctx.url,
      serverUrl: `${controller.ctx.protocol}://${controller.ctx.host}/api/comment`
    };
    ctx.state.oauthServices = [];
    if (token) {
      ctx.state.userInfo = await core.auth.resolveSession({token}, ctx);
    }
    // A Firekylin administrator JWT also authenticates the comment administrator.
    const sessionUser = adminAuth.currentUser(controller.ctx) || {};
    if (!think.isEmpty(sessionUser)) {
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
    if (!this.canAccessProtectedComments(controller, post)) throw new CommentError('COMMENT_DISABLED', 403, 'Comment is disabled');
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

  async notifyApprovedReply(controller, comment) {
    if (!comment.pid) return;
    const options = await controller.model('options').getOptions(true);
    const notification = notificationServices(options.comment || {}, options, process.env, undefined,
      id => controller.model('user').where({id}).field('email,name,display_name')
        .find()).notification;
    if (!notification) return;
    const parent = await controller.model('comment').where({id: comment.pid}).find();
    if (!parent || !parent.id) return;
    await notification.send({...comment, status: 'approved'}, parent, true);
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

module.exports.notificationServices = notificationServices;

module.exports.sendTestEmail = async function(config, recipient, options, env = process.env, mailer) {
  if (typeof recipient !== 'string' || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient)) {
    throw new Error('请填写有效的测试收件邮箱');
  }
  env = smtpSettings(config, options, env);
  if (!env.SMTP_HOST || !env.SMTP_FROM) throw new Error('请填写 SMTP 服务器和发件人邮箱');
  const transport = mailTransport(env, mailer);
  try {
    const result = await transport.sendMail({
      from: env.SMTP_FROM, to: recipient,
      ...renderNotificationMail(config, options, {
        nick: '测试用户', rawComment: '这是一封测试邮件，收到此邮件说明 SMTP 配置已生效。',
        url: options.site_url || '', status: 'approved'
      }, {nick: '原评论用户', comment: '这是一条用于预览模板的原评论。'}, recipient, '邮件通知测试')
    });
    if (result.rejected && result.rejected.length) throw new Error('SMTP 服务器拒绝了测试收件邮箱');
  } catch (error) {
    let detail = [error.code, error.command, error.message, error.response].filter(Boolean).join(' | ');
    for (const secret of [env.SMTP_PASS, env.SMTP_PASS && Buffer.from(env.SMTP_PASS).toString('base64')]) {
      if (secret) detail = detail.split(secret).join('[隐藏]');
    }
    throw new Error(detail.slice(0, 1500) || '邮件发送失败');
  } finally { transport.close?.() }
};

module.exports.renderNotificationMail = renderNotificationMail;
