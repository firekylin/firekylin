const nodemailer = require('nodemailer');
const Base = require('./base');

module.exports = class extends Base {
  /**
   * get
   * @return {[type]} [description]
   */
  async getAction() {
    const isCommenter = Number(this.userInfo.type) === 4;
    if (isCommenter && (!this.id || String(this.id) !== String(this.userInfo.id))) {
      return this.fail('USER_NO_PERMISSION');
    }
    let where = {};
    const modelInstance = this.modelInstance
      .field('id,name,display_name,email,type,status,create_time,last_login_time,app_key,app_secret');
    if (this.id) {
      where.id = this.id;
      const user = await modelInstance.where(where).find();
      user.social_accounts = await this.service('social-auth').list(user.id);
      try {
        user.social_services = [...await this.service('social-auth').services()];
      } catch {
        user.social_services = [];
      }
      for (const account of user.social_accounts) {
        if (!user.social_services.some(service => service.name === account.provider)) {
          user.social_services.push({name: account.provider, title: account.provider});
        }
      }
      return this.success(user);
    }

    if (this.get('type') === 'contributor') {
      where = {status: 2, type: 3};
    } else {
      where = {status: ['!=', 2], type: ['!=', 3], _logic: 'OR'};
    }

    const page = Math.max(1, parseInt(this.get('page'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(this.get('pageSize'), 10) || 20));
    const keyword = String(this.get('keyword') || '').trim();
    if (keyword) {
      where = {
        _complex: where,
        'name|display_name|email': ['like', `%${keyword}%`]
      };
    }
    const query = modelInstance.where(where).order('id DESC');
    const result = await query.page(page, pageSize).countSelect();
    const users = result.data;
    const ids = users.map(user => user.id);

    const posts = await this.model('post')
      .field('user_id, COUNT(*) as post_num')
      .where({user_id: ['IN', ids.length ? ids : [0]]})
      .setRelation(false)
      .group('user_id')
      .select();
    const postsNum = new Map(posts.map(({user_id, post_num}) => [user_id, post_num]));
    const comments = await this.model('comment')
      .field('user_id, COUNT(*) as comment_num')
      .where({user_id: ['IN', ids.length ? ids.map(String) : ['0']]})
      .group('user_id')
      .select();
    const commentsNum = new Map(comments.map(({user_id, comment_num}) => [Number(user_id), Number(comment_num)]));

    users.forEach(user => {
      user.post_num = postsNum.get(user.id) || 0;
      user.comment_num = commentsNum.get(Number(user.id)) || 0;
      user.social_accounts = [];
    });
    const socialAccounts = await this.service('social-auth').list(users.map(user => user.id));
    const usersById = new Map(users.map(user => [Number(user.id), user]));
    socialAccounts.forEach(account => usersById.get(Number(account.user_id))?.social_accounts.push(account));

    return this.success({...result, data: users});
  }

  /**
   * 删除用户
   *
   * @param {number} id 被删除用户id
   * @return {Promise}
   */
  async deleteAction() {
    const id = this.id;

    if (!id) {
      return this.fail('PARAMS_ERROR');
    }

    // 禁止删除当前登录用户
    if (id === String(this.userInfo.id)) {
      return this.fail('DELETE_CURRENT_USER_ERROR');
    }

    const pk = await this.modelInstance.pk;
    await this.model('user_social').where({user_id: Number(id)}).delete();
    const rows = await this.modelInstance.where({
      [pk]: id
    }).delete();

    return this.success({
      affectedRows: rows
    });
  }

  /**
   * add user
   * @return {[type]} [description]
   */
  async postAction(self) {
    if (this.get('type') === 'key') {
      return this.generateKey(self);
    }

    const data = this.post();
    const insertId = await this.modelInstance.addUser(data, this.ctx.ip);

    if (insertId.type === 'exist') {
      return this.fail('USER_EXIST');
    }

    return this.success({id: insertId});
  }

  async generateKey(self, status) {
    const isAdmin = this.userInfo.type === firekylin.USER_ADMIN;
    if (!isAdmin) {
      return this.fail();
    }

    const app_key = think.uuid();
    const app_secret = think.uuid();

    await this.modelInstance.generateKey(this.id, app_key, app_secret, status);

    if (status) {
      const user = await this.modelInstance.where({id: this.id}).find();
      const options = await this.model('options').getOptions();
      const config = options.comment || {};
      const host = config.smtpHost || process.env.SMTP_HOST;
      const from = config.smtpFrom || process.env.SMTP_FROM;
      const username = config.smtpUser || process.env.SMTP_USER;
      if (host && from && user.email) {
        let transporter;
        try {
          transporter = nodemailer.createTransport({
            host,
            port: Number(config.smtpPort || process.env.SMTP_PORT) || 465,
            secure: typeof config.smtpSecure === 'boolean' ? config.smtpSecure : process.env.SMTP_SECURE !== 'false',
            auth: username ? {user: username, pass: config.smtpPass || process.env.SMTP_PASS} : undefined,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
          });
          const siteUrl = options.site_url || `http://${this.ctx.host}`;
          await transporter.sendMail({
            from,
            to: user.email,
            subject: `【${options.title}】网站推送申请成功`,
            text: `你的推送申请审批通过。网站名称：${options.title}，网站地址：${siteUrl}。请登录后台查看 App Key 和 App Secret。`
          });
        } catch {
          think.logger.warn('User approval email could not be sent');
        } finally {
          transporter?.close();
        }
      }
    }

    return await this.getAction(self);
  }
  /**
   * update user info
   * @return {[type]} [description]
   */
  async putAction(self) {
    const type = this.get('type');

    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }

    if (type === 'contributor') {
      return await this.generateKey(self, 1);
    }

    let data = this.post();
    if (Number(this.userInfo.type) === 4) {
      if (String(this.id) !== String(this.userInfo.id)) return this.fail('USER_NO_PERMISSION');
      data = {display_name: data.display_name, email: data.email};
    }
    data.id = this.id;
    const rows = await this.modelInstance.saveUser(data, this.ctx.ip);
    return this.success({affectedRows: rows});
  }
};
