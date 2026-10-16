const Base = require('./base');

const MAX_MARKDOWN_LENGTH = 1000000;

module.exports = class extends Base {
  async postAction() {
    const input = this.post();
    const markdown = input.markdown_content;
    const type = Number(input.type);

    if (typeof markdown !== 'string' || markdown.length > MAX_MARKDOWN_LENGTH || ![0, 1].includes(type)) {
      return this.fail('PARAMS_ERROR');
    }

    const post = {type, markdown_content: markdown};
    const {content} = await this.model('post').renderContent(post);
    return this.success({html: content});
  }
};
