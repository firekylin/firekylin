'use strict';
const {AsyncLocalStorage} = require('node:async_hooks');
const {randomUUID} = require('node:crypto');

const storage = new AsyncLocalStorage();
function run(context, callback) {
  return storage.run({...storage.getStore(), correlationId: randomUUID(), ...context}, callback);
}
function current() {
  const context = storage.getStore();
  if (!context) return {actor_id: null, actor_name: '系统任务', source: 'system', correlation_id: randomUUID()};
  const user = context.user?.();
  return {actor_id: user?.id || null, actor_name: user?.name || (user?.id ? String(user.id) : '未知'),
    scenario: context.scenario, source: context.source || 'http', correlation_id: context.correlationId};
}
module.exports = {run, current};
