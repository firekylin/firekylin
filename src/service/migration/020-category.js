'use strict';
module.exports = {
  version: 1,
  async migrate() {
    await think.service('category-schema').migrate({skipIfUninstalled: true});
  }
};
