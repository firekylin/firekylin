const Base = require('./base');

const MAX_MARKDOWN_LENGTH = 1000000;

module.exports = class extends Base {
  async postAction() {
    const input = this.post();
    const markdown = input.markdown_content;
    const type = Number(input.type);
    const id = Number(input.id) || 0;

    if (typeof markdown !== 'string' || markdown.length > MAX_MARKDOWN_LENGTH || ![0, 1].includes(type)) {
      return this.fail('PARAMS_ERROR');
    }

    let post;
    if (id) {
      post = await this.model('post').where({id, type}).setRelation(false)
        .find();
      if (think.isEmpty(post)) return this.fail('PARAMS_ERROR');
      if ((this.userInfo.type | 0) !== 1 && Number(post.user_id) !== Number(this.userInfo.id)) {
        return this.fail('USER_NO_PERMISSION');
      }
      post = {...post, markdown_content: markdown};
    } else {
      post = {id: 0, type, user_id: this.userInfo.id, markdown_content: markdown};
    }

    const {content} = await this.model('post').renderContent(post);
    return this.success({html: content});
  }
};
