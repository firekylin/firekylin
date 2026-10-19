'use strict';

const PostCommandService = require('../service/post-command');
const PostQueryService = require('../service/post-query');
const CommentModerationService = require('../service/comment-moderation');
const permalink = require('../service/permalink');

const SETTING_KEYS = new Set([
  'title', 'description', 'site_url', 'logo_url', 'favicon_url', 'keywords', 'github_url',
  'twitter_url', 'miitbeian', 'mpsbeian', 'frontPageType', 'postTocManual',
  'auditFreshCreateTime', 'postsListSize', 'post_permalink', 'page_permalink',
  'auto_summary', 'feedFullText', 'analyze_code', 'comment'
]);

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
async function renderComment(value) {
  // The comment service extends think.Service, so load its standalone renderer lazily
  // after ThinkJS has initialized the global runtime.
  return require('../service/comment').renderMarkdown(value);
}

function registerManagementTools(registry, {getModel, now, getCommentService}) {
  const commands = new PostCommandService({getModel: () => getModel('post'), now});
  const queries = new PostQueryService({getModel: () => getModel('post'), now});
  const register = definition => {
    if (!registry.has(definition.name, 'core:management')) registry.register(definition, 'core:management');
  };
  const idSchema = {type: 'integer', minimum: 1};
  const objectSchema = (properties, required) => ({
    type: 'object', additionalProperties: false, properties, required
  });
  const commentService = () => {
    if (typeof getCommentService !== 'function') throw new Error('Comment count sync is not configured');
    return new CommentModerationService({
      getModel, now, syncCount: postId => getCommentService().syncCount({model: getModel}, postId)
    });
  };

  register({
    name: 'posts.list_managed', description: 'List posts available to the authenticated author',
    requiredPermissions: ['posts:manage:read'],
    inputSchema: objectSchema({
      page: idSchema, limit: {type: 'integer', minimum: 1, maximum: 100},
      status: {type: 'integer', minimum: 0, maximum: 4},
      keyword: {type: 'string', maxLength: 120}
    }, []),
    async execute(raw, context) {
      const principal = commands.actor(actor(context));
      const input = object(raw);
      keys(input, ['page', 'limit', 'status', 'keyword']);
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
        keyword: input.keyword
      });
      return {count: result.count, data: result.data};
    }
  });

  const taxonomyDefinition = (kind, method, description, requiresApproval = false) => ({
    name: `${kind}.${method}`, description,
    requiredPermissions: ['taxonomy:write'], requiresApproval,
    inputSchema: method === 'delete' ? objectSchema({id: idSchema}, ['id']) : objectSchema({
      ...(method === 'update' ? {id: idSchema} : {}),
      name: {type: 'string', minLength: 1, maxLength: 255},
      pathname: {type: 'string', minLength: 1, maxLength: 255},
      ...(kind === 'categories' ? {pid: {type: 'integer', minimum: 0}} : {})
    }, method === 'create' ? ['name', 'pathname'] : ['id']),
    async execute(raw, context) {
      const principal = actor(context);
      if (Number(principal.type) !== 1) throw new Error('Administrator required');
      const input = object(raw);
      const allowed = method === 'delete'
        ? ['id'] : ['id', 'name', 'pathname', ...(kind === 'categories' ? ['pid'] : [])];
      keys(input, allowed);
      const model = getModel(kind === 'categories' ? 'cate' : 'tag');
      if (method === 'delete') {
        await model[kind === 'categories' ? 'deleteCate' : 'deleteTag'](id(input.id));
        return {id: input.id, deleted: true};
      }
      const data = {};
      if (method === 'update') data.id = id(input.id);
      for (const key of ['name', 'pathname']) {
        if (Object.hasOwn(input, key)) data[key] = text(input[key], key, 255);
      }
      if (kind === 'categories' && Object.hasOwn(input, 'pid')) {
        if (!Number.isSafeInteger(input.pid) || input.pid < 0 || input.pid === data.id) {
          throw new TypeError('Invalid parent ID');
        }
        data.pid = input.pid;
      }
      if (method === 'update' && Object.keys(data).length === 1) {
        throw new TypeError('At least one field to update is required');
      }
      const action = kind === 'categories'
        ? (method === 'create' ? 'addCate' : 'saveCate')
        : (method === 'create' ? 'addTag' : 'saveTag');
      const result = await model[action](data);
      if (result && result.type === 'exist') {
        throw new Error(`${kind === 'categories' ? 'Category' : 'Tag'} already exists`);
      }
      return method === 'create' ? {id: result.id} : {id: data.id, affectedRows: result};
    }
  });

  for (const definition of [
    taxonomyDefinition('categories', 'create', 'Create a blog category'),
    taxonomyDefinition('categories', 'update', 'Update a blog category'),
    taxonomyDefinition('categories', 'delete', 'Delete a blog category and detach it from posts', true),
    taxonomyDefinition('tags', 'create', 'Create a blog tag'),
    taxonomyDefinition('tags', 'update', 'Update a blog tag'),
    taxonomyDefinition('tags', 'delete', 'Delete a blog tag and detach it from posts', true)
  ]) register(definition);

  register({
    name: 'posts.get_managed', description: 'Read an article or draft available to the authenticated author',
    requiredPermissions: ['posts:manage:read'],
    inputSchema: objectSchema({id: idSchema}, ['id']),
    async execute(raw, context) {
      const principal = commands.actor(actor(context));
      const input = object(raw);
      keys(input, ['id']);
      const post = await queries.getAdmin(id(input.id), principal);
      if (!post || !post.id) throw new Error('Post not found or permission denied');
      const {
        id: postId, title, pathname, markdown_content, summary, status, is_public, create_time, update_time
      } = post;
      return {id: postId, title, pathname, markdown_content, summary, status, is_public, create_time, update_time};
    }
  });

  register({
    name: 'comments.create', description: 'Publish a comment as the authenticated administrator',
    requiredPermissions: ['comments:write'],
    inputSchema: objectSchema({
      post_id: idSchema, comment: {type: 'string', minLength: 1, maxLength: 100000},
      nick: {type: 'string', minLength: 1, maxLength: 255},
      mail: {type: 'string', maxLength: 255}, link: {type: 'string', maxLength: 512}
    }, ['post_id', 'comment']),
    async execute(raw, context) {
      const principal = actor(context);
      if (Number(principal.type) !== 1) throw new Error('Administrator required');
      const input = object(raw);
      keys(input, ['post_id', 'comment', 'nick', 'mail', 'link']);
      const postId = id(input.post_id);
      const post = await getModel('post').where({id: postId, status: 3, is_public: 1})
        .setRelation(false)
        .find();
      if (!post || !post.id) throw new Error('Published post not found');
      const options = await getModel('options').getOptions();
      const timestamp = now();
      const commentId = await getModel('comment').add({
        post_id: postId, url: permalink.generate(post.type, post, options),
        comment: await renderComment(text(input.comment, 'comment', 100000)),
        nick: Object.hasOwn(input, 'nick')
          ? text(input.nick, 'nick', 255) : (principal.display_name || principal.name || 'Administrator'),
        mail: String(input.mail || principal.email || '').slice(0, 255),
        link: String(input.link || '').slice(0, 512),
        user_id: String(principal.id), status: 'approved', pid: '', rid: '', ua: 'MCP', ip: '', sticky: 0,
        like: 0, inserted_at: timestamp, created_at: timestamp, updated_at: timestamp
      });
      if (typeof getCommentService === 'function') await getCommentService().syncCount({model: getModel}, postId);
      return {id: Number(commentId), post_id: postId, status: 'approved'};
    }
  });

  register({
    name: 'comments.update', description: 'Edit an existing comment (administrator only)',
    requiredPermissions: ['comments:write'], requiresApproval: true,
    inputSchema: objectSchema({
      id: idSchema, comment: {type: 'string', minLength: 1, maxLength: 100000}
    }, ['id', 'comment']),
    async execute(raw, context) {
      const principal = actor(context);
      if (Number(principal.type) !== 1) throw new Error('Administrator required');
      const input = object(raw);
      keys(input, ['id', 'comment']);
      const comment = await renderComment(text(input.comment, 'comment', 100000));
      return commentService().moderate({id: id(input.id), operation: 'edit', comment}, principal);
    }
  });

  register({
    name: 'comments.moderate', description: 'Approve, hold, mark as spam, or delete a comment (administrator only)',
    requiredPermissions: ['comments:moderate'], requiresApproval: true,
    inputSchema: objectSchema({
      id: idSchema, status: {type: 'string', enum: ['approved', 'waiting', 'spam', 'delete']}
    }, ['id', 'status']),
    async execute(raw, context) {
      const principal = actor(context);
      if (Number(principal.type) !== 1) throw new Error('Administrator required');
      const input = object(raw);
      keys(input, ['id', 'status']);
      return commentService().moderate({id: id(input.id), operation: input.status}, principal);
    }
  });

  register({
    name: 'posts.update', description: 'Update an existing article, including published posts',
    requiredPermissions: ['posts:write'],
    requiresApproval: true,
    inputSchema: objectSchema({
      id: idSchema, title: {type: 'string', minLength: 1, maxLength: 255},
      pathname: {type: 'string', minLength: 1, maxLength: 255},
      markdown_content: {type: 'string', minLength: 1}
    }, ['id']),
    async execute(raw, context) {
      const principal = actor(context);
      const input = object(raw);
      keys(input, ['id', 'title', 'pathname', 'markdown_content']);
      id(input.id);
      if (!['title', 'pathname', 'markdown_content'].some(key => Object.hasOwn(input, key))) {
        throw new TypeError('At least one field to update is required');
      }
      const update = {id: input.id};
      for (const key of ['title', 'pathname', 'markdown_content']) {
        if (Object.hasOwn(input, key)) update[key] = text(input[key], key, key === 'markdown_content' ? 1000000 : 255);
      }
      return commands.update(update, principal);
    }
  });

  register({
    name: 'posts.create_draft', description: 'Create an unpublished private article draft',
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
    name: 'posts.update_draft', description: 'Update an existing article draft owned by the caller',
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
        .page(page, limit)
.setRelation(false)
.select();
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
      const result = await commentService().moderate({
        id: commentId, operation: 'approved', onlyWaiting: true
      }, principal);
      return {id: result.id, status: result.status};

    }
  });

  register({
    name: 'settings.get', description: 'Read MCP-manageable site settings (administrator only)',
    requiredPermissions: ['settings:read'],
    inputSchema: objectSchema({}, []),
    async execute(raw, context) {
      keys(object(raw), []);
      if (Number(actor(context).type) !== 1) throw new Error('Administrator required');
      const options = await getModel('options').getOptions();
      return Object.fromEntries([...SETTING_KEYS]
        .filter(key => Object.hasOwn(options, key))
        .map(key => [key, options[key]]));
    }
  });

  register({
    name: 'settings.update', description: 'Update allowlisted site settings (administrator only)',
    requiredPermissions: ['settings:write'], requiresApproval: true,
    inputSchema: objectSchema({settings: {type: 'object', minProperties: 1}}, ['settings']),
    async execute(raw, context) {
      const input = object(raw);
      keys(input, ['settings']);
      if (Number(actor(context).type) !== 1) throw new Error('Administrator required');
      const settings = object(input.settings);
      if (!Object.keys(settings).length) throw new TypeError('At least one setting is required');
      for (const key of Object.keys(settings)) {
        if (!SETTING_KEYS.has(key)) throw new TypeError('Unsupported setting: ' + key);
      }
      for (const key of ['post_permalink', 'page_permalink']) {
        if (Object.hasOwn(settings, key)) settings[key] = permalink.validate(text(settings[key], key, 255));
      }
      const serialized = Object.fromEntries(Object.entries(settings).map(([key, value]) => [
        key, typeof value === 'object' ? JSON.stringify(value) : String(value)
      ]));
      await getModel('options').updateOptions(serialized);
      return {updated: Object.keys(settings)};
    }
  });
}

module.exports = {registerManagementTools};
