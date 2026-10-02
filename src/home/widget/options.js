const Widget = require('../../common/widget/base');

function parse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

module.exports = class extends Widget {
  async execute() {
    const options = await this.model('options').getOptions();
    options.navigation = parse(options.navigation, []);
    options.themeConfig = parse(options.themeConfig, {});
    if (options.comment && options.comment.name) {
      const comment = parse(options.comment.name, {});
      delete comment.githubPassWord;
      options.comment.name = JSON.stringify(comment);
    }
    options.siteUrl = options.site_url || `http://${this.ctx.host}`;
    this.push(options);
  }

  get title() {
    return this.fieldAccessor('title');
  }

  get description() {
    return this.fieldAccessor('description');
  }

  get keywords() {
    return this.fieldAccessor('keywords');
  }

  get navigation() {
    return this.row.navigation;
  }

  get themeConfig() {
    return this.row.themeConfig;
  }

  get siteUrl() {
    return this.row.siteUrl;
  }

  themeUrl(pathname = '') {
    const base = process.env.FIREKYLIN_PROJECT_PATH ? 'themes' : 'theme';
    return `/${base}/${this.row.theme}/${String(pathname).replace(/^\//, '')}`;
  }
};
