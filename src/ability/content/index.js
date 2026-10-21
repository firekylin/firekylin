'use strict';

const PostQueryService = require('../../service/post-query');
const createList = require('./posts/list');
const createGet = require('./posts/get');
const createSearch = require('./posts/search');

function registerContentAbilities(registry, {getModel, now}) {
  if (!registry || typeof registry.register !== 'function') throw new TypeError('Tool registry required');
  if (typeof getModel !== 'function' || typeof now !== 'function') throw new TypeError('Model and clock required');
  const queries = new PostQueryService({getModel, now});
  for (const definition of [createList(queries), createGet(queries), createSearch(queries)]) {
    if (!registry.has(definition.name, 'core:content')) registry.register(definition, 'core:content');
  }
}

module.exports = {registerContentAbilities, registerContentTools: registerContentAbilities};
