'use strict';

const createListManaged = require('./management/posts/list-managed');
const createGetManaged = require('./management/posts/get-managed');

function createPostReadAbilities(dependencies) {
  return {list: createListManaged(dependencies), get: createGetManaged(dependencies)};
}

module.exports = {createPostReadAbilities};
