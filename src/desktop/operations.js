'use strict';

const {createHash} = require('node:crypto');

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

const hash = value => createHash('sha256').update(value).digest('hex');

class DesktopError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

// Durable at-most-once dispatch. A crash or uncertain side effect stays pending;
// it is never automatically repeated. The client can inspect the outcome later.
class Operations {
  constructor(getModel) { this.getModel = getModel; }
  key(userId, key) {
    if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(key)) {
      throw new DesktopError('IDEMPOTENCY_KEY_REQUIRED');
    }
    return hash(String(userId) + ':' + key);
  }
  async lookup(userId, key) {
    const row = await this.getModel('desktop_operation').where({operation_key: this.key(userId, key), user_id: userId})
      .find();
    if (!row || !row.operation_key) throw new DesktopError('OPERATION_NOT_FOUND', 404);
    return {state: row.state, result: row.result ? JSON.parse(row.result) : null};
  }
  async run(userId, key, request, action) {
    const operationKey = this.key(userId, key);
    const fingerprint = hash(JSON.stringify(canonical(request)));
    const model = () => this.getModel('desktop_operation');
    try {
      await model().add({operation_key: operationKey, user_id: userId, request_hash: fingerprint,
        state: 'pending', result: '', created_at: Date.now()});
    } catch (error) {
      const previous = await model().where({operation_key: operationKey, user_id: userId}).find();
      if (!previous || !previous.operation_key) throw error;
      if (previous.request_hash !== fingerprint) throw new DesktopError('IDEMPOTENCY_KEY_REUSED', 409);
      if (previous.state === 'failed') {
        const failure = JSON.parse(previous.result);
        throw new DesktopError(failure.error, failure.status);
      }
      if (previous.state !== 'completed') throw new DesktopError('OUTCOME_UNKNOWN', 409);
      return JSON.parse(previous.result);
    }
    let result;
    try { result = await action(); } catch (error) {
      if (error instanceof DesktopError) {
        await model().where({operation_key: operationKey}).update({state: 'failed',
          result: JSON.stringify({error: error.code, status: error.status})});
      }
      throw error;
    }
    await model().where({operation_key: operationKey}).update({state: 'completed', result: JSON.stringify(result)});
    return result;
  }
}

module.exports = {Operations, DesktopError};
