'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {OptionsCache} = require('../../src/service/options-cache');

test('cache expires, isolates databases, and protects cached data from mutation', async() => {
  let now = 0;
  let queries = 0;
  const cache = new OptionsCache({now: () => now, ttl: 5});
  const model = {config: {database: 'a'}, select: async() => [{key: 'test', value: {n: ++queries}}]};
  const first = await cache.read(model);
  first[0].value.n = 100;
  assert.equal((await cache.read(model))[0].value.n, 1);
  now = 5;
  assert.equal((await cache.read(model))[0].value.n, 2);
  await cache.read({...model, config: {database: 'b'}});
  assert.equal(queries, 3);
});

test('failed queries retry and invalidation prevents in-flight results repopulating cache', async() => {
  const cache = new OptionsCache();
  let resolve;
  const model = {select: () => new Promise(done => { resolve = done })};
  const old = cache.read(model);
  await Promise.resolve();
  cache.invalidate(model);
  model.select = async() => [{key: 'state', value: 'new'}];
  assert.equal((await cache.read(model))[0].value, 'new');
  resolve([{key: 'state', value: 'old'}]);
  await old;
  assert.equal((await cache.read(model))[0].value, 'new');
  cache.invalidate(model);
  model.select = async() => { throw new Error('offline') };
  await assert.rejects(cache.read(model), /offline/);
  model.select = async() => [];
  assert.deepEqual(await cache.read(model), []);
});

test('worker notification invalidates cached data and listener binds only once', async() => {
  const previous = global.think;
  const messenger = new EventEmitter();
  global.think = {messenger};
  try {
    const cache = new OptionsCache();
    let value = 'old';
    const model = {select: async() => [{key: 'state', value}]};
    await cache.read(model);
    value = 'new';
    messenger.emit('firekylin:options-invalidated', cache.key(model));
    assert.equal((await cache.read(model))[0].value, 'new');
    assert.equal(messenger.listenerCount('firekylin:options-invalidated'), 1);
  } finally { global.think = previous }
});
