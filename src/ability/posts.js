'use strict';

const PostQueryService = require('../service/post-query');
const PostCommandService = require('../service/post-command');

function object(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Object input required');
  return input;
}
function id(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('Invalid ID');
  return value;
}
function keys(input, allowed) {
  for (const key of Object.keys(input)) if (!allowed.includes(key)) throw new TypeError('Unsupported property: ' + key);
}
function actor(context) {
  if (!context || !context.principal) throw new Error('Authenticated principal required');
  return context.principal;
}

/** Transport-neutral post read abilities, backed by one PostQueryService. */
function createPostReadAbilities({getModel, now}) {
  const queries = new PostQueryService({getModel: () => getModel('post'), now});
  const commands = new PostCommandService({getModel: () => getModel('post'), now});
  const idSchema = {type: 'integer', minimum: 1};
  const objectSchema = (properties, required) => ({type: 'object', additionalProperties: false, properties, required});
  const list = {
    name: 'posts.list_managed', description: 'List posts available to the authenticated author',
    expose: {mcp: true, admin: true},
    requiredPermissions: ['posts:manage:read'],
    inputSchema: objectSchema({
      page: idSchema, limit: {type: 'integer', minimum: 1, maximum: 100},
      status: {type: 'integer', minimum: 0, maximum: 4},
      keyword: {type: 'string', maxLength: 120},
      cate: {type: 'string', maxLength: 30}
    }, []),
    async execute(raw, context) {
      const principal = commands.actor(actor(context));
      const input = object(raw);
      keys(input, ['page', 'limit', 'status', 'keyword', 'cate']);
      const page = input.page === undefined ? 1 : id(input.page);
      const pageSize = input.limit === undefined ? 15 : id(input.limit);
      if (pageSize > 100) throw new TypeError('Invalid limit');
      if (input.status !== undefined && (!Number.isInteger(input.status) || input.status < 0 || input.status > 4)) {
        throw new TypeError('Invalid status');
      }
      if (input.keyword !== undefined && (typeof input.keyword !== 'string' || input.keyword.length > 120)) {
        throw new TypeError('Invalid keyword');
      }
      const result = await queries.listAdmin({
        userInfo: principal, page, pageSize,
        status: input.status === undefined ? undefined : input.status,
        keyword: input.keyword, cate: input.cate
      });
      return {count: result.count, data: result.data};
    }
  };

  const get = {
    name: 'posts.get_managed', description: 'Read an article or draft available to the authenticated author',
    expose: {mcp: true, admin: true},
    requiredPermissions: ['posts:manage:read'],
    inputSchema: objectSchema({id: idSchema}, ['id']),
    async execute(raw, context) {
      const principal = commands.actor(actor(context));
      const input = object(raw);
      keys(input, ['id']);
      const post = await queries.getAdmin(id(input.id), principal);
      if (!post || !post.id) throw new Error('Post not found or permission denied');
      if (context.channel === 'admin') return post;
      const {
        id: postId, title, pathname, markdown_content, summary, status, is_public, create_time, update_time
      } = post;
      return {id: postId, title, pathname, markdown_content, summary, status, is_public, create_time, update_time};
    }
  };

  return {list, get};
}

module.exports = {createPostReadAbilities};
