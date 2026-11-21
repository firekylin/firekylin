'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {DesktopError} = require('./operations');
const {number, text, options} = require('./content');
const Moderation = require('../service/comment-moderation');
const {createAttachment} = require('../service/media-attachment');
const permalink = require('../service/permalink');

const UPLOAD_LIMIT = 5 * 1024 * 1024;
const MIME_TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf', txt: 'text/plain', zip: 'application/zip', mp3: 'audio/mpeg', mp4: 'video/mp4'
};
const EXTENSIONS = Object.keys(MIME_TYPES);

class Collections {
  constructor({getModel, principal, siteOptions, ctx}) {
    this.getModel = getModel;
    this.principal = principal;
    this.options = siteOptions;
    this.ctx = ctx;
  }
  get admin() { return Number(this.principal.type) === global.firekylin.USER_ADMIN; }
  get editor() { return Number(this.principal.type) === global.firekylin.USER_EDITOR; }
  requireManager() {
    if (!this.admin && !this.editor) throw new DesktopError('PERMISSION_DENIED', 403);
  }
  async commentPermission(row) {
    if (this.admin) return true;
    const post = await this.getModel('post').where({id: row.post_id}).setRelation(false)
      .find();
    return this.editor && post?.id && Number(post.user_id) === Number(this.principal.id);
  }
  async comments(query) {
    this.requireManager();
    const where = {};
    if (query.status && query.status !== 'all') {
      if (!['waiting', 'approved', 'spam'].includes(query.status)) throw new DesktopError('INVALID_STATUS');
      where.status = query.status;
    }
    if (query.keyword) where.comment = ['LIKE', '%' + text(query.keyword, 200) + '%'];
    if (!this.admin) {
      const owned = await this.getModel('post').where({user_id: Number(this.principal.id)}).field('id')
        .select();
      where.post_id = ['IN', owned.length ? owned.map(row => row.id) : [0]];
    }
    const page = query.page ? number(query.page) : 1;
    const result = await this.getModel('comment').where(where).order('inserted_at DESC, id DESC')
      .page(page, 30)
      .countSelect();
    const items = await Promise.all(result.data.map(async row => {
      const post = await this.getModel('post').where({id: row.post_id}).setRelation(false)
        .find();
      return {id: Number(row.id), author: row.nick || 'Anonymous', body: row.comment || '', status: row.status,
        createdAt: row.inserted_at, parentId: row.pid || '', postTitle: post?.title || 'Deleted content',
        postURL: post?.id
         ? new URL(permalink.generate(post.type, post, this.options), this.options.site_url).href : null,
        canModerate: Boolean(post?.id && await this.commentPermission(row))};
    }));
    return {items, total: Number(result.count), page, pageSize: 30};
  }
  async comment(id, input) {
    this.requireManager();
    const row = await this.getModel('comment').where({id: number(id)}).find();
    if (!row?.id) throw new DesktopError('COMMENT_NOT_FOUND', 404);
    if (!await this.commentPermission(row)) throw new DesktopError('PERMISSION_DENIED', 403);
    const service = think.service('comment');
    const controller = {model: this.getModel, ctx: this.ctx, service: name => think.service(name)};
    if (input.action === 'reply') {
      const post = await this.getModel('post').where({id: row.post_id}).find();
      if (!post?.id) throw new DesktopError('CONTENT_NOT_FOUND', 404);
      const body = text(input.body, 20000, false);
      const {core, users} = await service.create(controller);
      const usersFound = await users.select({objectId: String(this.principal.id), type: ['!=', 'banned']});
      if (!usersFound[0]) throw new DesktopError('ACCOUNT_UNAVAILABLE', 403);
      const context = {headers: {}, state: {userInfo: usersFound[0]}, ip: this.ctx.ip,
        serverUrl: this.options.site_url + '/api/comment'};
      const reply = await core.comment.create({
        url: permalink.generate(post.type, post, this.options), pid: String(row.id),
        rid: String(row.rid || row.id), comment: body
      }, context);
      await service.syncCount(controller, row.post_id);
      return {id: Number(reply.objectId), status: reply.status, body: reply.comment};
    }
    if (!['approved', 'waiting', 'spam', 'delete'].includes(input.action)) throw new DesktopError('INVALID_ACTION');
    const moderation = new Moderation({getModel: this.getModel, now: () => think.datetime(),
      syncCount: postId => service.syncCount(controller, postId),
      notifyApprovedReply: value => service.notifyApprovedReply(controller, value)});
    await moderation.moderate({id: number(id), operation: input.action, allowEditor: true}, this.principal);
    if (input.action === 'delete') return {id: number(id), deleted: true, repliesDeleted: false};
    const updated = await this.getModel('comment').where({id: number(id)}).find();
    return {id: number(id), status: updated.status};
  }
  mediaItem(row) {
    const attachment = options(row.options).attachment || {};
    let url = null;
    try {
      const value = new URL(attachment.url, this.options.site_url);
      if (['http:', 'https:'].includes(value.protocol) && !value.username && !value.password) url = value.href;
    } catch { /* Invalid legacy URLs remain visible without an open/copy action. */ }
    return {id: Number(row.id), name: row.title, url, mime: attachment.mime || 'application/octet-stream',
      size: Number(attachment.size) || 0, width: attachment.width || null, height: attachment.height || null,
      createdAt: row.create_time, storage: attachment.storage || '',
      canDelete: this.admin || Number(row.user_id) === Number(this.principal.id)};
  }
  async media(query) {
    this.requireManager();
    const where = {type: global.firekylin.POST_ATTACHMENT};
    if (!this.admin) where.user_id = Number(this.principal.id);
    if (query.keyword) where.title = ['LIKE', '%' + text(query.keyword, 200) + '%'];
    const page = query.page ? number(query.page) : 1;
    const result = await this.getModel('post').where(where).setRelation(false)
      .order('create_time DESC, id DESC')
      .page(page, 30)
      .countSelect();
    return {items: result.data.map(row => this.mediaItem(row)), total: Number(result.count), page, pageSize: 30};
  }
  async upload(input) {
    this.requireManager();
    const name = text(input.name, 200, false);
    const extension = name.split('.').pop().toLowerCase();
    if (!EXTENSIONS.includes(extension) || (/[\\/]/.test(name) || [...name].some(value => value.charCodeAt(0) < 32))) throw new DesktopError('FILE_TYPE_UNSUPPORTED');
    if (typeof input.base64 !== 'string' || input.base64.length > Math.ceil(UPLOAD_LIMIT / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.base64)) {
      throw new DesktopError('INVALID_UPLOAD', 413);
    }
    const bytes = Buffer.from(input.base64, 'base64');
    if (!bytes.length || bytes.length > UPLOAD_LIMIT) throw new DesktopError('UPLOAD_TOO_LARGE', 413);
    let dimensions = {};
    if (MIME_TYPES[extension].startsWith('image/')) {
      try {
        const metadata = await require('sharp')(bytes, {limitInputPixels: 40000000}).metadata();
        const expected = ['jpg', 'jpeg'].includes(extension) ? 'jpeg' : extension;
        if (metadata.format !== expected) throw new Error('Image format mismatch');
        dimensions = {width: metadata.width, height: metadata.height};
      } catch { throw new DesktopError('INVALID_IMAGE'); }
    }
    const config = this.options.upload;
    const providers = ['local', 'qiniu', 'upyun', 'aliyun', 'tencent', 's3', 'r2', 'minio',
      'backblaze', 'wasabi', 'digitalocean', 'vercel'];
    if (!config || !providers.includes(config.type)) throw new DesktopError('STORAGE_UNAVAILABLE', 503);
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'firekylin-desktop-'));
    try {
      const file = {name, path: path.join(directory, 'upload.' + extension), size: bytes.length,
        type: MIME_TYPES[extension]};
      await fs.writeFile(file.path, bytes, {flag: 'wx', mode: 0o600});
      const sdk = ['local', 'r2', 'minio', 'backblaze', 'wasabi', 'digitalocean', 'vercel'].includes(config.type);
      const url = await think.service('upload/' + (sdk ? 'files-sdk' : config.type)).run(file.path,
        {...config, name: crypto.randomUUID(), file});
      const created = await createAttachment({url, file, storage: config.type, userId: this.principal.id},
        {getModel: () => this.getModel('post'), now: () => think.datetime(), uuid: () => crypto.randomUUID()});
      const row = await this.getModel('post').where({id: Number(created.id || created)}).setRelation(false)
        .find();
      if (dimensions.width) {
        const values = options(row.options);
        Object.assign(values.attachment, dimensions);
        await this.getModel('post').where({id: row.id}).update({options: JSON.stringify(values)});
        row.options = values;
      }
      return this.mediaItem(row);
    } finally { await fs.rm(directory, {recursive: true, force: true}); }
  }
  async removeMedia(id) {
    this.requireManager();
    const row = await this.getModel('post').where({id: number(id), type: global.firekylin.POST_ATTACHMENT})
      .setRelation(false)
      .find();
    if (!row?.id) throw new DesktopError('MEDIA_NOT_FOUND', 404);
    if (!this.mediaItem(row).canDelete) throw new DesktopError('PERMISSION_DENIED', 403);
    // Providers have different deletion APIs. Removing the catalog entry does not
    // promise deletion of storage objects or rewrite references in published posts.
    await this.getModel('post').deletePost(row.id);
    return {id: number(id), deleted: true, storedFileRetained: true};
  }
}

module.exports = {Collections, UPLOAD_LIMIT, EXTENSIONS};
