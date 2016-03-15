/**
 * this file will be loaded before server started
 * you can define global functions used in controllers, models, templates
 */
import fs from 'fs';

global.firekylin = {
  POST_PUBLIC: 1,
  POST_ALLOW_COMMENT: 1,
  POST_ARTICLE: 0,
  POST_PAGE: 1,
  POST_DRAFT: 0,
  POST_AUDITING: 1,
  POST_REJECT: 2,
  POST_PUBLISH: 3
}

/**
 * is installed
 * @type {Boolean}
 */
firekylin.isInstalled = false;
try{
  let installedFile = think.ROOT_PATH + think.sep + '.installed';
  if(fs.accessSync && fs.accessSync(installedFile, fs.F_OK)){
    firekylin.isInstalled = true;
  }
  if(fs.existsSync(installedFile)){
    firekylin.isInstalled = true;
  }
}catch(e){}

/**
 * set app is installed
 * @return {[type]} [description]
 */
firekylin.setInstalled = () => {
  firekylin.isInstalled = true;
  let installedFile = think.ROOT_PATH + think.sep + '.installed';
  fs.writeFileSync(installedFile, 'firekylin');
}

