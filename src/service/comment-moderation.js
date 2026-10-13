'use strict';

/**
 * Shared moderation operations used by the admin API and AI tools.
 * No HTTP or session details are accepted here.
 */
class CommentModerationService {
  constructor({getModel, now, syncCount}) {
    if (typeof getModel !== 'function' || typeof now !== 'function' || typeof syncCount !== 'function') {
      throw new TypeError('Moderation dependencies are required');
    }
    this.getModel = getModel;
    this.now = now;
    this.syncCount = syncCount;
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
    if (operation === 'delete') {
      await model.delete();
    } else if (operation === 'edit') {
      await model.update({comment: String(comment || ''), updated_at: this.now()});
    } else {
      await model.update({status: operation, updated_at: this.now()});
    }
    await this.syncCount(existing.post_id);
    return {id, status: operation};
  }
}

module.exports = CommentModerationService;
