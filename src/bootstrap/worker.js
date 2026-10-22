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
const {registerContentAbilities} = require('../ability/content');
const {registerManagementAbilities} = require('../ability/management');
const {registerMediaAbilities} = require('../ability/media/upload');
const {migrateOAuthModels} = require('../mcp/oauth-schema');
const pack = require('../../package.json');
const {PackageCatalog} = require('../service/package-catalog');
const {ThemeInstaller} = require('../service/theme-installer');
const {PluginInstaller} = require('../service/plugin-installer');
const {AIStore} = require('../ai/store');

const existingPluginManager = global.firekylin && global.firekylin.plugins instanceof PluginManager
  ? global.firekylin.plugins
  : null;

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
  USER_COMMENTER: 4,
  USER_AVAILABLE: 1,
  USER_DISABLED: 2,
  Widget: widget.Widget,
  registerWidget: widget.registerWidget
};

widget.ensureWidgetMap(widgets);
widget.loadProjectWidgets(getContext());

const projectContext = getContext();
const packageRuntime = {
  themeInstaller: new ThemeInstaller({
    themesPath: projectContext.themesPath || path.join(projectContext.projectPath, 'themes'),
    backupPath: path.join(projectContext.projectPath, '.firekylin', 'theme-backups'),
    firekylinVersion: pack.version,
    readOnly: Boolean(process.env.VERCEL)
  }),
  pluginInstaller: new PluginInstaller({
    projectPath: projectContext.projectPath,
    readOnly: Boolean(process.env.VERCEL)
  })
};
const packageApi = {
  list: async() => {
    const options = await think.model('options').getOptions();
    return new PackageCatalog({pluginManager: global.firekylin.plugins,
      themesPath: projectContext.themesPath || path.join(projectContext.projectPath, 'themes'),
      firekylinVersion: pack.version}).installed(options.theme);
  },
  check: manifest => new PackageCatalog({pluginManager: global.firekylin.plugins,
    themesPath: projectContext.themesPath || path.join(projectContext.projectPath, 'themes'),
    firekylinVersion: pack.version}).check(manifest),
  installPlugin: (name, version) => packageRuntime.pluginInstaller.install(name, version),
  uninstallPlugin: name => packageRuntime.pluginInstaller.uninstall(name),
  installTheme: (archive, options) => packageRuntime.themeInstaller.install(archive, options),
  themeBackups: () => packageRuntime.themeInstaller.backups(),
  rollbackTheme: backup => packageRuntime.themeInstaller.rollback(backup)
};
const pluginManager = existingPluginManager || new PluginManager({
  projectPath: projectContext.projectPath,
  config: projectContext.config || {},
  version: pack.version,
  logger: console,
  packageApi,
  aiStore: new AIStore({
    getOptions: includePrivate => think.model('options').getOptions(includePrivate),
    updateOptions: (key, value) => think.model('options').updateOptions(key, value),
    getCredentialValue: key => think.model('options').getCredentialValue(key),
    setCredentialValue: (key, value) => think.model('options').setCredentialValue(key, value),
    deleteCredentialValue: key => think.model('options').deleteCredentialValue(key)
  })
});
pluginManager.packageApi = packageApi;
global.firekylin.plugins = pluginManager;
registerContentAbilities(pluginManager.abilities, {
  getModel: () => think.model('post'),
  now: () => think.datetime()
});
registerManagementAbilities(pluginManager.abilities, {
  getModel: name => think.model(name),
  now: () => think.datetime(),
  getCommentService: () => think.service('comment')
});
registerMediaAbilities(pluginManager.abilities, {
  getUploadConfig: async() => (await think.model('options').getOptions()).upload,
  getUploader: type => think.service('upload/' + type)
});
if (!existingPluginManager) {
  pluginManager.load().then(() => pluginManager.events.emit('app.ready', {version: pack.version})).catch(error => {
    console.error(`[plugin] app.bootstrap failed: ${error.stack || error.message}`);
  });
}

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

const commentMigrationKey = Symbol.for('firekylin.commentSchemaMigration');
if (!global[commentMigrationKey]) {
  global[commentMigrationKey] = true;
  think.beforeStartServer(async() => {
    const migrated = await think.service('comment-schema').migrate({skipIfUninstalled: true});
    if (migrated) think.logger.info('[comment] database schema migrated');
  });
}

const categoryMigrationKey = Symbol.for('firekylin.categorySchemaMigration');
if (!global[categoryMigrationKey]) {
  global[categoryMigrationKey] = true;
  think.beforeStartServer(async() => {
    const migrated = await think.service('category-schema').migrate({skipIfUninstalled: true});
    if (migrated) think.logger.info('[category] database schema migrated');
  });
}

const oauthMigrationKey = Symbol.for('firekylin.mcp.oauthMigration');
if (!global[oauthMigrationKey]) {
  global[oauthMigrationKey] = true;
  think.beforeStartServer(async() => {
    try {
      // Do not attempt migration before the site has been installed.
      const options = await think.model('options').getOptions(true);
      if (!options.site_url) return;
      await migrateOAuthModels({
        model: think.model('user'), config: think.config('model')
      });
    } catch (error) {
      if (/no such table.*options|relation .*options.*does not exist|table .*options.*doesn't exist|ER_NO_SUCH_TABLE/i.test(error.message)) return;
      throw error;
    }
  });
}
