'use strict';
/* eslint-disable max-len */

const Base = require('../base');

module.exports = class extends Base {
  async indexAction() {
    const method = this.ctx.method.toUpperCase();
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) this.ctx.throw(405);
    const resource = this.get('resource');
    const id = this.get('id');
    if (resource === 'ui' && id === 'login') return this.loginPage();
    if (resource === 'ui' && id === 'profile') return this.redirect('/admin');
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
      const {core, users, tokenService, avatarService} = await service.create(this);
      const ctx = await service.context(this, users, core, tokenService, avatarService);
      const input = method === 'GET' ? this.get() : this.post();
      let result;
      if (resource === 'comment') {
        if (method === 'GET') {
          if (input.type === 'count') {
            const url = typeof input.url === 'string' && input.url.includes(',') ? input.url.split(',') : input.url;
            result = await core.comment.count({url}, ctx);
          }
          else if (input.type === 'recent') result = await core.comment.listRecent(input, ctx);
          else result = await core.comment.list(input, ctx);
        } else if (method === 'POST') {
          await service.validateCommentTarget(this, input.url);
          result = await core.comment.create(input, ctx);
          await service.syncCount(this, input.url);
        } else if (method === 'PUT') {
          const old = (await this.model('comment').where({id}).find());
          result = await core.comment.update({objectId: id, data: input}, ctx);
          await service.syncCount(this, old.url);
        } else {
          const old = (await this.model('comment').where({id}).find());
          result = await core.comment.remove({objectId: id}, ctx);
          await service.syncCount(this, old.url);
        }
      } else if (resource === 'token') {
        if (method === 'GET') {
          if (ctx.state.userInfo) {
            const userInfo = {...ctx.state.userInfo};
            delete userInfo.password;
            result = userInfo;
          } else result = await core.auth.resolveSession({token: ctx.state.token}, ctx);
        }
        else if (method === 'DELETE') result = {};
        else result = await core.auth.login(input, ctx);
      } else if (resource === 'user') {
        if (method === 'GET') result = id ? await core.user.get({email: input.email}, ctx) : await core.user.list(input, ctx);
        else if (method === 'POST') result = await core.user.register(input, ctx);
        else if (method === 'PUT') result = await core.user.update({objectId: id, data: input}, ctx);
        else result = await core.user.remove({objectId: id}, ctx);
      } else if (resource === 'article') {
        result = method === 'GET' ? await core.counter.get(input, ctx) : await core.counter.update(input, ctx);
      } else if (resource === 'verification') {
        result = await core.verification.verifyEmail(input, ctx);
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
    const sessionUser = await this.session('userInfo') || {};
    if (think.isEmpty(sessionUser)) {
      const callback = encodeURIComponent(this.ctx.url);
      return this.redirect(`/admin/login?redirect=${callback}`);
    }
    const service = this.service('comment');
    const {core, users, tokenService, avatarService} = await service.create(this);
    const ctx = await service.context(this, users, core, tokenService, avatarService);
    const user = ctx.state.userInfo;
    if (!user) return this.redirect('/admin/login');
    const userInfo = {...user};
    delete userInfo.password;
    const data = JSON.stringify({...userInfo, remember: true}).replace(/</g, '\\u003c');
    this.ctx.type = 'text/html';
    this.ctx.body = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>评论登录成功</title></head><body><p>登录成功，正在返回评论页面…</p><script>const data=${data};localStorage.setItem('WALINE_USER',JSON.stringify(data));if(window.opener){window.opener.postMessage({type:'userInfo',data},location.origin);window.close()}else{location.href='/'}</script></body></html>`;
  }
};
