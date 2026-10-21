'use strict';

const PostQueryService = require('../../../service/post-query');
const PostCommandService = require('../../../service/post-command');
const {object, id, keys, actor, objectSchema} = require('../../shared/input');

module.exports = function createPostsGetManaged({getModel, now}) {
  const queries = new PostQueryService({getModel: () => getModel('post'), now});
  const commands = new PostCommandService({getModel: () => getModel('post'), now});
  return {
    name: 'posts.get_managed', description: 'Read an article or draft available to the authenticated author',
    expose: {mcp: true, admin: true}, requiredPermissions: ['posts:manage:read'],
    inputSchema: objectSchema({id: {type: 'integer', minimum: 1}}, ['id']),
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
};
