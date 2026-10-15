'use strict';

const pack = require('../../../../package.json');
const Base = require('./base');
const {PackageCatalog} = require('../../../service/package-catalog');

module.exports = class extends Base {
  catalog() {
    return new PackageCatalog({
      pluginManager: global.firekylin && global.firekylin.plugins,
      themesPath: think.THEMES_PATH,
      firekylinVersion: pack.version
    });
  }

  getAction() {
    return this.success(this.catalog().installed(this.authOptions.theme));
  }

  postAction() {
    const manifest = this.post('manifest');
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return this.fail('INVALID_MANIFEST');
    return this.success(this.catalog().check(manifest));
  }
};
