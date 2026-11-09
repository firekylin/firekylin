'use strict';
const {AsyncLocalStorage} = require('node:async_hooks');
const {isDeepStrictEqual} = require('node:util');

const storage = new AsyncLocalStorage();

async function run(next) {
  const state = {entries: [], writes: 0, active: true};
  return storage.run(state, async() => {
    try { return await next() } finally {
      // Async work detached from the response must not retain a request snapshot.
      state.active = false;
      state.entries = [];
    }
  });
}

function read(model) {
  const state = storage.getStore();
  // Preserve chained queries and transaction/connection semantics. A SQL router
  // can select a different database on each call, so it cannot share a snapshot.
  if (!state?.active || state.writes || Object.keys(model.options || {}).length ||
      model.config?.parser || model.config?.reuseDB || model.hasOptionsConnection ||
      model.db?.().query?.connection) {
    return model.select();
  }
  let entry = state.entries.find(item => item.table === model.tableName &&
    isDeepStrictEqual(item.config, model.config));
  if (!entry) {
    entry = {table: model.tableName, config: think.extend({}, model.config)};
    // Start select synchronously, just as before, so it consumes model.options
    // before another call can change the query builder on this model instance.
    entry.promise = Promise.resolve(model.select()).catch(error => {
      state.entries = state.entries.filter(item => item !== entry);
      throw error;
    });
    state.entries.push(entry);
  }
  return entry.promise;
}

async function write(callback) {
  const state = storage.getStore();
  if (!state?.active) return callback();
  // Do not cache a read racing a write. Invalidate both before and after, even
  // on rejection: a batch may have partially succeeded. Old in-flight SELECTs
  // remain usable by their original callers, but cannot repopulate this cache.
  state.entries = [];
  state.writes++;
  try { return await callback() } finally {
    state.entries = [];
    state.writes--;
  }
}

module.exports = {run, read, write};
