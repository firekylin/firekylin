'use strict';

const PostCommandService = require('../service/post-command');
const CommentModerationService = require('../service/comment-moderation');

function object(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Object input required');
  return input;
}
function id(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('Invalid ID');
  return value;
}
function text(value, name, max = 1000000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new TypeError('Invalid ' + name);
  return value;
}
function keys(input, allowed) {
  for (const key of Object.keys(input)) if (!allowed.includes(key)) throw new TypeError('Unsupported property: ' + key);
}
function actor(context) {
  if (!context || !context.principal) throw new Error('Authenticated principal required');
  return context.principal;
}

function registerManagementTools(registry, {getModel, now, getCommentService}) {
  const commands = new PostCommandService({getModel: () => getModel('post'), now});
  const register = definition => registry.register(definition, 'core-management');
  const idSchema = {type: 'integer', minimum: 1};
  const objectSchema = (properties, required) => ({
    type: 'object', additionalProperties: false, properties, required
  });

  register({
    name: 'posts.createDraft', description: 'Create an unpublished private article draft',
    requiredPermissions: ['posts:write'],
    inputSchema: objectSchema({
      title: {type: 'string', minLength: 1, maxLength: 255},
      pathname: {type: 'string', minLength: 1, maxLength: 255},
      markdown_content: {type: 'string', minLength: 1}
    }, ['title', 'pathname', 'markdown_content']),
    async execute(raw, context) {
      const input = object(raw);
      keys(input, ['title', 'pathname', 'markdown_content']);
      const data = {
        title: text(input.title, 'title', 255),
        pathname: text(input.pathname, 'pathname', 255),
        markdown_content: text(input.markdown_content, 'markdown_content')
      };
      return commands.createDraft(data, actor(context));
    }
  });

  register({
    name: 'posts.updateDraft', description: 'Update an existing article draft owned by the caller',
    requiredPermissions: ['posts:write'],
    inputSchema: objectSchema({
      id: idSchema, title: {type: 'string', minLength: 1, maxLength: 255},
      pathname: {type: 'string', minLength: 1, maxLength: 255},
      markdown_content: {type: 'string', minLength: 1}
    }, ['id']),
    async execute(raw, context) {
      const input = object(raw);
      keys(input, ['id', 'title', 'pathname', 'markdown_content']);
      id(input.id);
      if (!['title', 'pathname', 'markdown_content'].some(key => Object.hasOwn(input, key))) {
        throw new TypeError('At least one field to update is required');
      }
      const data = {id: input.id};
      for (const key of ['title', 'pathname', 'markdown_content']) {
        if (Object.hasOwn(input, key)) data[key] = text(input[key], key, key === 'markdown_content' ? 1000000 : 255);
      }
      return commands.updateDraft(data, actor(context));
    }
  });

  register({
    name: 'posts.publish', description: 'Publish a draft or pending post (administrator only)',
    requiredPermissions: ['posts:publish'],
    requiresApproval: true,
    inputSchema: objectSchema({id: idSchema}, ['id']),
    async execute(raw, context) {
      const input = object(raw);
      keys(input, ['id']);
      return commands.publish(id(input.id), actor(context));
    }
  });

  register({
    name: 'posts.delete', description: 'Permanently delete a post (irreversible)',
    requiredPermissions: ['posts:delete'],
    requiresApproval: true,
    inputSchema: objectSchema({id: idSchema}, ['id']),
    async execute(raw, context) {
      const input = object(raw);
      keys(input, ['id']);
      return commands.delete(id(input.id), actor(context));
    }
  });

  register({
    name: 'categories.list', description: 'List blog categories',
    requiredPermissions: ['taxonomy:read'],
    inputSchema: objectSchema({}, []),
    async execute(raw) {
      keys(object(raw), []);
      const rows = await getModel('cate').setRelation(false).select();
      return rows.map(({id, name, pathname, pid}) => ({id, name, pathname, pid}));
    }
  });

  register({
    name: 'tags.list', description: 'List blog tags',
    requiredPermissions: ['taxonomy:read'],
    inputSchema: objectSchema({}, []),
    async execute(raw) {
      keys(object(raw), []);
      const rows = await getModel('tag').setRelation(false).select();
      return rows.map(({id, name, pathname}) => ({id, name, pathname}));
    }
  });

  register({
    name: 'comments.list', description: 'List comments for moderation (administrators only)',
    requiredPermissions: ['comments:read'],
    inputSchema: objectSchema({
      page: idSchema, limit: {type: 'integer', minimum: 1, maximum: 100},
      status: {type: 'string', enum: ['approved', 'waiting', 'spam']}
    }, []),
    async execute(raw, context) {
      actor(context);
      if (Number(context.principal.type) !== 1) throw new Error('Administrator required');
      const input = object(raw);
      keys(input, ['page', 'limit', 'status']);
      const page = input.page === undefined ? 1 : id(input.page);
      const limit = input.limit === undefined ? 20 : id(input.limit);
      if (limit > 100) throw new TypeError('Invalid limit');
      if (input.status !== undefined && !['approved', 'waiting', 'spam'].includes(input.status)) {
        throw new TypeError('Invalid status');
      }
      const where = input.status ? {status: input.status} : {};
      const rows = await getModel('comment').where(where).order('inserted_at DESC')
        .page(page, limit).setRelation(false).select();
      return rows.map(({id, post_id, nick, comment, status, inserted_at}) => ({
        id, post_id, nick, comment, status, inserted_at
      }));
    }
  });

  register({
    name: 'comments.approve', description: 'Approve a waiting comment',
    requiredPermissions: ['comments:moderate'],
    requiresApproval: true,
    inputSchema: objectSchema({id: idSchema}, ['id']),
    async execute(raw, context) {
      const principal = actor(context);
      if (Number(principal.type) !== 1) throw new Error('Administrator required');
      const input = object(raw);
      keys(input, ['id']);
      const commentId = id(input.id);
      if (typeof getCommentService !== 'function') throw new Error('Comment count sync is not configured');
      const service = new CommentModerationService({
        getModel,
        now,
        syncCount: postId => getCommentService().syncCount({model: getModel}, postId)
      });
      const result = await service.moderate({id: commentId, operation: 'approved', onlyWaiting: true}, principal);
      return {id: result.id, status: result.status};

    }
  });
}

module.exports = {registerManagementTools};
