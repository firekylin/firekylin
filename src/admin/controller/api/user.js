const nodemailer = require('nodemailer');
const Base = require('./base');

module.exports = class extends Base {
  /**
   * get
   * @return {[type]} [description]
   */
  async getAction() {
    let where = {};
    let modelInstance = this.modelInstance
      .field('id,name,display_name,email,type,status,create_time,last_login_time,app_key,app_secret');
    if(this.id) {
      where.id = this.id;
      let user = await modelInstance.where(where).find();
      return this.success(user);
    }

    if(this.get('type') === 'contributor') {
      where = {status: 2, type: 3};
    } else {
      where = {status: ['!=', 2], type: ['!=', 3], _logic: 'OR'};
    }

    let users = await modelInstance.where(where).select();
    let posts = await this.model('post')
      .field('user_id, COUNT(*) as post_num, SUM(comment_num) as comment_num')
      .setRelation(false)
      .group('user_id')
      .select();
    let postsNum = new Map(posts.map(({user_id, post_num}) => [user_id, post_num]));
    let commentsNum = new Map(posts.map(({user_id, comment_num}) => [user_id, comment_num]));

    users.forEach(user => {
      user.post_num = postsNum.get(user.id) || 0;
      user.comment_num = commentsNum.get(user.id) || 0;
    });

    return this.success(users);
  }

  /**
   * 删除用户
   *
   * @param {number} id 被删除用户id
   * @return {Promise}
   */
  async deleteAction() {
    let id = this.id;

    if (!id) {
      return this.fail('PARAMS_ERROR');
    }

    // 禁止删除当前登录用户
    if (id === String(this.userInfo.id)) {
      return this.fail('DELETE_CURRENT_USER_ERROR');
    }

    let pk = await this.modelInstance.pk;
    let rows = await this.modelInstance.where({
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
    if(this.get('type') === 'key') {
      return this.generateKey(self);
    }

    let data = this.post();
    let insertId = await this.modelInstance.addUser(data, this.ctx.ip);

    if (insertId.type === 'exist') {
      return this.fail('USER_EXIST');
    }

    return this.success({id: insertId});
  }

  async generateKey(self, status) {
    let isAdmin = this.userInfo.type === firekylin.USER_ADMIN;
    // let isMine = this.userInfo.id === this.id;
    if(!isAdmin) {
      return this.fail();
    }

    let app_key = think.uuid();
    let app_secret = think.uuid();

    await this.modelInstance.generateKey(this.id, app_key, app_secret, status);

    let user = await this.modelInstance.where({id: this.id}).find();
    let options = await this.model('options').getOptions();
    let transporter = nodemailer.createTransport();
    let site_url = options.hasOwnProperty('site_url') ? options.site_url : `http://${this.ctx.host}`;
    transporter.sendMail({
      from: 'no-reply@firekylin.org',
      to: user.email,
      subject: `【${options.title}】网站推送申请成功`,
      text: `你的推送申请审批通过，请将下面的信息添加到自己的博客中完成最后的推送操作。
        网站名称：${options.title}
        网站地址：${site_url}
        app_key: ${app_key}
        app_secret: ${app_secret}
      `
    });


    // if(status !== null) { this.id = null; }
    return await this.getAction(self);
  }
  /**
   * update user info
   * @return {[type]} [description]
   */
  async putAction(self) {
    let type = this.get('type');

    if (!this.id) {
      return this.fail('PARAMS_ERROR');
    }

    if(type === 'contributor') {
      return await this.generateKey(self, 1);
    }

    let data = this.post();
    data.id = this.id;
    let rows = await this.modelInstance.saveUser(data, this.ctx.ip);
    return this.success({affectedRows: rows});
  }
}
