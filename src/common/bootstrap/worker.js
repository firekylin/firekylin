// invoked in worker
/**
 * this file will be loaded before server started
 * you can define global functions used in controllers, models, templates
 */
const fs = require('fs');
const path = require('path');

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
  USER_DISABLED: 2
};

/**
 * is installed
 * @type {Boolean}
 */
firekylin.isInstalled = false;
try {
  const installedFile = path.join(think.ROOT_PATH, '.installed');
  if (fs.accessSync && fs.accessSync(installedFile, fs.F_OK)) {
    firekylin.isInstalled = true;
  }
  if (fs.existsSync(installedFile)) {
    firekylin.isInstalled = true;
  }
} catch (e) {
  // fs.accessSync failed
}

/**
 * set app is installed
 * @return {[type]} [description]
 */
firekylin.setInstalled = () => {
  firekylin.isInstalled = true;
  const installedFile = path.join(think.ROOT_PATH, '.installed');
  fs.writeFileSync(installedFile, 'firekylin');
};

firekylin.require = name => {
  const pkgName = path.join(think.ROOT_PATH, 'package.json');
  const reg = new RegExp(`firekylin-${name}-\\w+$`, 'i');
  try {
    const {dependencies} = require(pkgName);
    for(const depName in dependencies) {
      if(!reg.test(depName)) {
        continue;
      }
      return require(depName);
    }
  } catch(e) {
    return false;
  }
}
