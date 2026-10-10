// invoked in worker
/**
 * this file will be loaded before server started
 * you can define global functions used in controllers, models, templates
 */
const path = require('path');
const widget = require('../widget/registry');
const widgets = require('../widget');
const {getContext} = require('../../lib/project-context');
const {PluginManager} = require('../plugin/manager');
const pack = require('../../package.json');

global.firekylin = {
  POST_PUBLIC: 1,
  POST_ALLOW_COMMENT: 1,
  POST_ARTICLE: 0,
  POST_PAGE: 1,
  POST_DRAFT: 0,
  POST_AUDITING: 1,
  POST_REJECT: 2,
  POST_PUBLISH: 3,
  USER_ADMIN: 1,
  USER_EDITOR: 2,
  USER_CONTRIBUTOR: 3,
  USER_AVAILABLE: 1,
  USER_DISABLED: 2,
  Widget: widget.Widget,
  registerWidget: widget.registerWidget
};

widget.ensureWidgetMap(widgets);
widget.loadProjectWidgets(getContext());

const projectContext = getContext();
const pluginManager = new PluginManager({
  projectPath: projectContext.projectPath,
  config: projectContext.config || {},
  version: pack.version,
  logger: console
});
global.firekylin.plugins = pluginManager;
pluginManager.load().then(() => pluginManager.events.emit('app.ready', {version: pack.version})).catch(error => {
  console.error(`[plugin] app.bootstrap failed: ${error.stack || error.message}`);
});

/**
 * is installed
 * @type {Boolean}
 */
firekylin.isInstalled = undefined;

/**
 * set app is installed
 * @return {[type]} [description]
 */
firekylin.setInstalled = () => {
  firekylin.isInstalled = true;
};

firekylin.require = name => {
  const pkgName = path.join(think.ROOT_PATH, 'package.json');
  const reg = new RegExp(`firekylin-${name}-\\w+$`, 'i');
  try {
    const {dependencies} = require(pkgName);
    for (const depName in dependencies) {
      if (!reg.test(depName)) {
        continue;
      }
      return require(depName);
    }
  } catch (e) {
    return false;
  }
};
