'use strict';
module.exports = {
  version: 1,
  async migrate(context) {
    await require('../chat-schema').migrate(context);
  }
};
