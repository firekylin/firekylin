const Widget = require('./base');
const permalink = require('../service/permalink');
const {CREDENTIAL_PREFIX} = require('../ai/store');

function parse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

module.exports = class extends Widget {
  async execute() {
    const options = await this.model('options').getOptions(true);
    this.ctx.state = this.ctx.state || {};
    this.ctx.state.jwtSecret = options.jwt_secret || options.comment_jwt_secret;
    delete options.jwt_secret;
    delete options.comment_jwt_secret;
    delete options.comment_schema_version;
    delete options.ai_credentials;
    for (const key of Object.keys(options)) {
      if (key.startsWith(CREDENTIAL_PREFIX)) delete options[key];
    }
    options.navigation = parse(options.navigation, []);
    options.themeConfig = parse(options.themeConfig, {});
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

  contentPermalink(content, type) {
    const contentType = typeof type === 'undefined' ? content.type : type;
    return permalink.generate(contentType, content, this.row);
  }

  themeUrl(pathname = '') {
    const base = process.env.FIREKYLIN_PROJECT_PATH ? 'themes' : 'theme';
    return `/${base}/${this.row.theme}/${String(pathname).replace(/^\//, '')}`;
  }
};
