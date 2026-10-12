'use strict';

/**
 * Public, read-only content tools for AI clients.
 * No route or MCP endpoint is opened by registering these tools.
 */
function registerContentTools(registry, {getModel, now}) {
  if (!registry || typeof registry.register !== 'function') throw new TypeError('Tool registry required');
  if (typeof getModel !== 'function' || typeof now !== 'function') throw new TypeError('Model and clock required');

  const publicWhere = () => ({
    type: 0,
    status: 3,
    is_public: 1,
    create_time: {'<=': now()}
  });
  const positiveInteger = (value, defaultValue, max) => {
    if (value === undefined && defaultValue !== undefined) return defaultValue;
    if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new TypeError('Invalid positive integer');
    return value;
  };
  const checkInput = input => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Invalid tool input');
    return input;
  };
  const summary = post => ({
    id: post.id,
    title: post.title,
    pathname: post.pathname,
    summary: post.summary,
    create_time: post.create_time,
    update_time: post.update_time
  });

  registry.register({
    name: 'posts.list',
    description: 'List publicly published blog articles, newest first',
    requiredPermissions: ['posts:read'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {page: {type: 'integer', minimum: 1, maximum: 10000},
        limit: {type: 'integer', minimum: 1, maximum: 50}}
    },
    async execute(input = {}) {
      input = checkInput(input);
      const page = positiveInteger(input.page, 1, 10000);
      const limit = positiveInteger(input.limit, 10, 50);
      const rows = await getModel().where(publicWhere())
        .field('id,title,pathname,summary,create_time,update_time')
        .setRelation(false).order('create_time DESC').page(page, limit).select();
      return rows.map(summary);
    }
  }, 'core-content');

  registry.register({
    name: 'posts.get',
    description: 'Read a publicly published blog article by numeric ID',
    requiredPermissions: ['posts:read'],
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {id: {type: 'integer', minimum: 1}}, required: ['id']
    },
    async execute(input = {}) {
      input = checkInput(input);
      const id = positiveInteger(input.id, undefined, Number.MAX_SAFE_INTEGER);
      const post = await getModel().where({...publicWhere(), id})
        .field('id,title,pathname,summary,markdown_content,create_time,update_time')
        .setRelation(false).find();
      if (!post || !post.id) return null;
      return {...summary(post), markdown_content: post.markdown_content};
    }
  }, 'core-content');

  registry.register({
    name: 'posts.search',
    description: 'Search titles or content of publicly published articles',
    requiredPermissions: ['posts:read'],
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {query: {type: 'string', minLength: 1, maxLength: 120},
        limit: {type: 'integer', minimum: 1, maximum: 50}}, required: ['query']
    },
    async execute(input = {}) {
      input = checkInput(input);
      if (typeof input.query !== 'string' || !input.query.trim() || input.query.length > 120) {
        throw new TypeError('Invalid query');
      }
      const limit = positiveInteger(input.limit, 10, 50);
      const rows = await getModel().where({
        ...publicWhere(),
        'title|content': ['LIKE', '%' + input.query.trim() + '%']
      }).field('id,title,pathname,summary,create_time,update_time')
        .setRelation(false).order('create_time DESC').limit(limit).select();
      return rows.map(summary);
    }
  }, 'core-content');
}

module.exports = {registerContentTools};
