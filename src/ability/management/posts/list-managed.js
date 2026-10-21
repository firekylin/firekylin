'use strict';

const PostQueryService = require('../../../service/post-query');
const PostCommandService = require('../../../service/post-command');
const {object, id, keys, actor, objectSchema} = require('../../shared/input');

module.exports = function createPostsListManaged({getModel, now}) {
  const queries = new PostQueryService({getModel: () => getModel('post'), now});
  const commands = new PostCommandService({getModel: () => getModel('post'), now});
  return {
    name: 'posts.list_managed', description: 'List posts available to the authenticated author',
    expose: {mcp: true, admin: true}, requiredPermissions: ['posts:manage:read'],
    inputSchema: objectSchema({
      page: {type: 'integer', minimum: 1}, limit: {type: 'integer', minimum: 1, maximum: 100},
      status: {type: 'integer', minimum: 0, maximum: 4}, keyword: {type: 'string', maxLength: 120},
      cate: {type: 'string', maxLength: 30}
    }),
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
        userInfo: principal, page, pageSize, status: input.status === undefined ? undefined : input.status,
        keyword: input.keyword, cate: input.cate
      });
      return {count: result.count, data: result.data};
    }
  };
};
