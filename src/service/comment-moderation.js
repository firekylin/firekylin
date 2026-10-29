'use strict';
const {emit, filterStrict} = require('../plugin/runtime');

/**
 * Shared moderation operations used by the admin API and AI tools.
 * No HTTP or session details are accepted here.
 */
class CommentModerationService {
  constructor({getModel, now, syncCount, notifyApprovedReply}) {
    if (typeof getModel !== 'function' || typeof now !== 'function' || typeof syncCount !== 'function') {
      throw new TypeError('Moderation dependencies are required');
    }
    this.getModel = getModel;
    this.now = now;
    this.syncCount = syncCount;
    this.notifyApprovedReply = notifyApprovedReply;
  }

  async moderate({id, operation, comment, onlyWaiting = false, allowCommenter = false}, principal) {
    const commenter = principal && Number(principal.type) === 4 && allowCommenter;
    if (!principal || (Number(principal.type) !== 1 && !commenter)) throw new Error('Administrator required');
    if (commenter && !['delete', 'edit'].includes(operation)) throw new Error('USER_NO_PERMISSION');
    if (!Number.isSafeInteger(id) || id <= 0) throw new TypeError('Invalid comment ID');
    if (!['delete', 'approved', 'waiting', 'spam', 'edit'].includes(operation)) {
      throw new Error('INVALID_OPERATION');
    }
    const where = commenter ? {id, user_id: String(principal.id)} : {id};
    const existing = await this.getModel('comment').where(where).setRelation(false)
      .find();
    if (commenter && existing.id && String(existing.user_id) !== String(principal.id)) {
      throw new Error('USER_NO_PERMISSION');
    }
    if (!existing || !existing.id) throw new Error('COMMENT_NOT_FOUND');
    if (onlyWaiting && existing.status !== 'waiting') throw new Error('Only waiting comments can be approved');
    const model = this.getModel('comment').where(where);
    const event = operation === 'delete' ? 'comment.beforeDelete' : 'comment.beforeUpdate';
    const change = operation === 'delete' ? {id, comment: existing, operation} : {
      id, comment: existing, operation,
      data: operation === 'edit' ? {comment: String(comment || '')} : {status: operation}
    };
    const filtered = await filterStrict(event, change, {source: 'moderation', principal});
    if (!filtered || typeof filtered !== 'object' || Array.isArray(filtered)) {
      throw new TypeError('Invalid comment filter result');
    }
    if (operation !== 'delete' &&
      (!filtered.data || typeof filtered.data !== 'object' || Array.isArray(filtered.data))) {
      throw new TypeError('Invalid comment update filter result');
    }
    if (operation === 'delete') {
      await model.delete();
    } else if (operation === 'edit') {
      await model.update({...filtered.data, updated_at: this.now()});
    } else {
      await model.update({...filtered.data, updated_at: this.now()});
    }
    await this.syncCount(existing.post_id);
    if (existing.status === 'waiting' && operation === 'approved' && this.notifyApprovedReply) {
      await this.notifyApprovedReply(existing);
    }
    await emit(operation === 'delete' ? 'comment.deleted' : 'comment.updated',
      {id, previous: existing, operation, data: filtered.data, source: 'moderation', principal});
    return {id, status: operation};
  }
}

module.exports = CommentModerationService;
