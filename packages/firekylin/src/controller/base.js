
const path = require('path');
const pack = require('../../package.json');
const {WidgetFactory} = require('../widget/registry');
const {getContext} = require('../../lib/project-context');

module.exports = class extends think.Controller {
  constructor(...args) {
    super(...args);
    this.APP_VIEW_PATH = path.join(think.ROOT_PATH, 'view');
  }
  /**
   * some base method in here
   */
  async __before() {
    this.widgetFactory = new WidgetFactory(this);
    const widget = this.widgetFactory.widget.bind(this.widgetFactory);
    widget.destroy = this.widgetFactory.destroy.bind(this.widgetFactory);
    this.assign('widget', widget);

    let options;
    try {
      const optionsWidget = await this.getWidget('Widget_Options');
      options = optionsWidget.row;
      firekylin.isInstalled = Boolean(options.site_url);
    } catch (e) {
      firekylin.isInstalled = false;
    }
    if (this.ctx.action === 'install') {
      return;
    }
    if (!firekylin.isInstalled) {
      return this.redirect('/index/install');
    }

    this.options = options;
    this.assign('VERSION', pack.version);
    this.assign('think', think);
    // set theme view root path
    const theme = options.theme || 'firekylin';
    this.THEME_VIEW_PATH = path.join(getContext().themesPath, theme);
    this.widgetFactory.useTheme(getContext().themesPath, theme);

    this.assign('currentYear', (new Date()).getFullYear());
  }

  getWidget(name, params = {}) {
    return this.widgetFactory.widget(name, params);
  }
  /**
   * display view page
   * @param  {} name []
   * @return {}      []
   */
  async displayView(name) {
    if (this.ctx.url.match(/\.json(?:\?|$)/)) {
      const jsonOutput = {};
      const assignObj = this.assign();
      Object.keys(assignObj).forEach((key) => {
        if (['controller', 'http', 'config', '_', 'options', 'widget'].indexOf(key) === -1) {
          jsonOutput[key] = assignObj[key];
        }
      });

      this.ctx.type = 'application/json';
      this.ctx.body = jsonOutput;
      return true;
    }

    return this.display(path.join(this.THEME_VIEW_PATH, name + '.eta'), {
      viewPath: this.THEME_VIEW_PATH
    });
  }
};
