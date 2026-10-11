'use strict';
/* eslint-disable max-len */

const Base = require('../base');

module.exports = class extends Base {
  async indexAction() {
    if (!this.isGet && !this.isPost && !this.isPut && !this.isDelete) this.ctx.throw(405);
    const resource = this.get('resource');
    const id = this.get('id');
    if (resource === 'ui' && id === 'login') return this.loginPage();
    if (!this.isGet) {
      const origin = this.ctx.get('origin');
      if (origin) {
        let allowed = false;
        try { allowed = new URL(origin).host === this.ctx.host } catch (e) { allowed = false }
        if (!allowed) this.ctx.throw(403, 'Cross-origin request is not allowed');
      }
    }
    const service = this.service('waline');
    try {
      const {core, users} = await service.create(this);
      const ctx = await service.context(this, users);
      const input = this.isGet ? this.get() : this.post();
      let result;
      if (resource === 'comment') {
        if (this.isGet) {
          if (input.type === 'count') {
            const url = typeof input.url === 'string' && input.url.includes(',') ? input.url.split(',') : input.url;
            result = await core.comment.count({url}, ctx);
          }
          else if (input.type === 'recent') result = await core.comment.listRecent(input, ctx);
          else result = await core.comment.list(input, ctx);
        } else if (this.isPost) {
          await service.validateCommentTarget(this, input.url);
          result = await core.comment.create(input, ctx);
          await service.syncCount(this, input.url);
        } else if (this.isPut) {
          const old = (await this.model('comment').where({id}).find());
          result = await core.comment.update({objectId: id, data: input}, ctx);
          await service.syncCount(this, old.url);
        } else {
          const old = (await this.model('comment').where({id}).find());
          result = await core.comment.remove({objectId: id}, ctx);
          await service.syncCount(this, old.url);
        }
      } else if (resource === 'token') {
        if (this.isGet) result = await core.auth.resolveSession({token: ctx.state.token}, ctx);
        else if (this.isDelete) result = {};
        else result = await core.auth.login(input, ctx);
      } else if (resource === 'user') {
        if (this.isGet) result = id ? await core.user.get({email: input.email}, ctx) : await core.user.list(input, ctx);
        else if (this.isPost) result = await core.user.register(input, ctx);
        else if (this.isPut) result = await core.user.update({objectId: id, data: input}, ctx);
        else result = await core.user.remove({objectId: id}, ctx);
      } else if (resource === 'article') {
        result = this.isGet ? await core.counter.get(input, ctx) : await core.counter.update(input, ctx);
      } else if (resource === 'verification') {
        result = await core.verification.verifyEmail(input, ctx);
      } else {
        this.ctx.throw(404);
      }
      return this.success(typeof result === 'undefined' ? {} : result);
    } catch (error) {
      const status = Number(error.status || error.statusCode) || 500;
      this.ctx.status = status;
      this.ctx.body = {errno: error.code || error.name || 'WALINE_ERROR', errmsg: error.message, data: error.data};
      if (status >= 500) think.logger.error(error);
    }
  }

  loginPage() {
    this.ctx.type = 'text/html';
    this.ctx.body = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>评论登录</title><style>body{font:16px system-ui;max-width:420px;margin:10vh auto;padding:24px}input,button{box-sizing:border-box;width:100%;padding:10px;margin:6px 0}button{cursor:pointer}.error{color:#c00}</style></head><body><h1>评论账号</h1><form id="form"><input name="display_name" placeholder="昵称（注册时填写）"><input name="email" type="email" required placeholder="邮箱"><input name="password" type="password" required placeholder="密码"><button name="mode" value="login">登录</button><button name="mode" value="register" type="button" id="register">注册</button></form><p class="error" id="error"></p><script>const form=document.querySelector(\'#form\'),error=document.querySelector(\'#error\');async function submit(mode){error.textContent=\'\';const body=Object.fromEntries(new FormData(form));const path=mode===\'register\'?\'user\':\'token\';const response=await fetch(\'/api/waline/api/\'+path,{method:\'POST\',headers:{\'content-type\':\'application/json\'},body:JSON.stringify(body)});const result=await response.json();if(result.errno){error.textContent=result.errmsg||\'操作失败\';return}if(mode===\'register\'){error.style.color=\'green\';error.textContent=\'注册成功，请登录\';return}const data={...result.data,remember:true};if(window.opener){window.opener.postMessage({type:\'userInfo\',data},location.origin);window.close()}else{const redirect=new URLSearchParams(location.search).get(\'redirect\');localStorage.setItem(\'WALINE_USER\',JSON.stringify(data));location.href=redirect||\'/\'}}form.addEventListener(\'submit\',event=>{event.preventDefault();submit(\'login\').catch(err=>error.textContent=err.message)});document.querySelector(\'#register\').onclick=()=>submit(\'register\').catch(err=>error.textContent=err.message);</script></body></html>';
  }
};
