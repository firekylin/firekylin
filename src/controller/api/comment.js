'use strict';
/* eslint-disable max-len */

const captcha = require('../../service/captcha');
const adminAuth = require('../../service/admin-auth');
const Base = require('../base');

module.exports = class extends Base {
  async indexAction() {
    const method = this.ctx.method.toUpperCase();
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) this.ctx.throw(405);
    const resource = this.get('resource');
    const id = this.get('id');
    if (resource === 'ui' && id === 'login') return this.loginPage();
    if (resource === 'ui' && id === 'profile') return this.redirect('/admin');
    if (resource === 'oauth') return this.oauth();
    if (method !== 'GET') {
      const origin = this.ctx.get('origin');
      if (origin) {
        let allowed = false;
        try { allowed = new URL(origin).host === this.ctx.host } catch (e) { allowed = false }
        if (!allowed) this.ctx.throw(403, 'Cross-origin request is not allowed');
      }
    }
    const service = this.service('comment');
    try {
      const {core, users, options, config, tokenService, avatarService} = await service.create(this);
      const ctx = await service.context(this, users, core, tokenService, avatarService);
      const input = method === 'GET' ? this.get() : this.post();
      let result;
      if (resource === 'comment') {
        if (method === 'GET') {
          if (input.type === 'count') {
            const url = typeof input.url === 'string' && input.url.includes(',') ? input.url.split(',') : input.url;
            result = await core.comment.count({url}, ctx);
          } else if (input.type === 'recent') result = await core.comment.listRecent(input, ctx);
          else result = await core.comment.list(input, ctx);
        } else if (method === 'POST') {
          const post = await service.validateCommentTarget(this, input.url);
          service.validateCommentInput(input, ctx, config);
          input.captcha = input.captcha || input.turnstile || input.recaptchaV3;
          result = await core.comment.create(input, ctx);
          await service.syncCount(this, post.id);
        } else if (method === 'PUT') {
          const old = (await this.model('comment').where({id}).find());
          service.validateCommentInput(input, ctx, config, false);
          result = await core.comment.update({objectId: id, data: input}, ctx);
          await service.syncCount(this, old.post_id);
        } else {
          const old = (await this.model('comment').where({id}).find());
          result = await core.comment.remove({objectId: id}, ctx);
          await service.syncCount(this, old.post_id);
        }
      } else if (resource === 'token') {
        if (method === 'GET') {
          if (ctx.state.userInfo) {
            const userInfo = {...ctx.state.userInfo};
            delete userInfo.password;
            result = userInfo;
          } else result = await core.auth.resolveSession({token: ctx.state.token}, ctx);
        } else if (method === 'DELETE') result = {};
        else {
          if (!await captcha.verify(captcha.settings(options), input.captcha || input.turnstile || input.recaptchaV3, ctx.ip, 'login')) {
            this.ctx.throw(403, '验证码校验失败，请重试');
          }
          result = await core.auth.login(input, ctx);
        }
      } else if (resource === 'user') {
        if (method === 'GET') result = id ? await core.user.get({email: input.email}, ctx) : await core.user.list(input, ctx);
        else if (method === 'POST') result = await core.user.register(input, ctx);
        else if (method === 'PUT') result = await core.user.update({objectId: id, data: input}, ctx);
        else result = await core.user.remove({objectId: id}, ctx);
      } else if (resource === 'article') {
        result = method === 'GET' ? await core.counter.get(input, ctx) : await core.counter.update(input, ctx);
      } else if (resource === 'verification') {
        result = await core.verification.verifyEmail(input, ctx);
      } else if (resource === 'social') {
        const user = ctx.state.userInfo;
        if (!user) this.ctx.throw(401, 'Login required');
        const social = this.service('social-auth');
        if (method === 'GET') result = await social.list(user.objectId);
        else if (method === 'DELETE') result = {affectedRows: await social.unlink(user.objectId, id)};
        else this.ctx.throw(405);
      } else {
        this.ctx.throw(404);
      }
      this.ctx.success(typeof result === 'undefined' ? {} : result);
    } catch (error) {
      const status = Number(error.status || error.statusCode) || 500;
      this.ctx.status = status;
      this.ctx.body = {errno: error.code || error.name || 'COMMENT_ERROR', errmsg: error.message, data: error.data};
      if (status >= 500) think.logger.error(error);
    }
  }

  async loginPage() {
    const token = this.get('token');
    if (token) return this.completeLogin(token);
    const service = this.service('comment');
    const {core, users, tokenService, avatarService} = await service.create(this);
    const sessionUser = adminAuth.currentUser(this.ctx) || {};
    if (think.isEmpty(sessionUser)) {
      const adminCallback = encodeURIComponent(this.ctx.url);
      return this.redirect(`/admin/login?redirect=${adminCallback}`);
    }
    const ctx = await service.context(this, users, core, tokenService, avatarService);
    const user = ctx.state.userInfo;
    if (!user) return this.redirect('/admin/login');
    return this.completeLogin(user.token);
  }

  async completeLogin(token) {
    const service = this.service('comment');
    const {core, users, tokenService, avatarService} = await service.create(this);
    const ctx = await service.context(this, users, core, tokenService, avatarService);
    const user = ctx.state.userInfo || await core.auth.resolveSession({token}, ctx);
    if (!user) return this.redirect('/api/comment/ui/login');
    const userInfo = {...user, token};
    delete userInfo.password;
    const data = JSON.stringify({...userInfo, remember: true}).replace(/</g, '\\u003c');
    this.ctx.type = 'text/html';
    this.ctx.body = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>评论登录成功</title></head><body><p>登录成功，正在返回评论页面…</p><script>const data=${data};localStorage.setItem('WALINE_USER',JSON.stringify(data));if(window.opener){window.opener.postMessage({type:'userInfo',data},location.origin);window.close()}else{location.href='/'}</script></body></html>`;
  }

  async oauth() {
    const input = this.get();
    const social = this.service('social-auth');
    await social.assertProvider(input.type);
    if (!input.code) {
      const callback = new URL(`${this.ctx.protocol}://${this.ctx.host}/api/comment/oauth`);
      callback.searchParams.set('type', input.type);
      if (input.redirect) callback.searchParams.set('redirect', input.redirect);
      const target = new URL(`${social.oauthUrl()}/${input.type}`);
      target.searchParams.set('redirect', callback.toString());
      const sessionUser = adminAuth.currentUser(this.ctx);
      target.searchParams.set('state', await social.createState(sessionUser && sessionUser.id));
      return this.redirect(target.toString());
    }
    const service = this.service('comment');
    const {core, users, tokenService, avatarService} = await service.create(this);
    const ctx = await service.context(this, users, core, tokenService, avatarService);
    const oauthState = await social.verifyState(input.state);
    if (!oauthState) this.ctx.throw(400, 'Invalid or expired OAuth state');
    if (oauthState.userId) {
      if (!ctx.state.userInfo || Number(ctx.state.userInfo.objectId) !== oauthState.userId) {
        this.ctx.throw(403, 'The signed-in user changed during social account binding');
      }
    } else {
      ctx.state.userInfo = undefined;
    }
    const result = await social.authorize(input, ctx, users, tokenService);
    if (result.linked && ctx.state.userInfo) return this.redirect(`/admin/user/edit/${ctx.state.userInfo.objectId}`);
    const redirect = this.safeRedirect(input.redirect) || '/api/comment/ui/login';
    let target = new URL(redirect, `${this.ctx.protocol}://${this.ctx.host}`);
    if (target.pathname === '/admin' || target.pathname.startsWith('/admin/')) {
      const backendUser = await this.model('user').where({id: Number(result.user.objectId)}).find();
      if (!think.isEmpty(backendUser) && Number(backendUser.status) === 1 && [1, 2, 4].includes(Number(backendUser.type))) {
        adminAuth.login(this.ctx, backendUser, true);
        return this.redirect(target.toString());
      }
      target = new URL('/api/comment/ui/login', `${this.ctx.protocol}://${this.ctx.host}`);
    }
    target.searchParams.set('token', result.token);
    return this.redirect(target.toString());
  }

  safeRedirect(value) {
    if (!value) return '';
    try {
      const target = new URL(value, `${this.ctx.protocol}://${this.ctx.host}`);
      return target.host === this.ctx.host ? target.toString() : '';
    } catch (e) { return '' }
  }

};
