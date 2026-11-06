'use strict';
module.exports = {
  version: 1,
  async migrate() {
    await think.service('comment-schema').migrate({skipIfUninstalled: true});
  }
};
