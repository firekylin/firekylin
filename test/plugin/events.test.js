'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const EventBus = require('../../src/plugin/events');

test('event bus orders async listeners and filters values', async() => {
  const events = new EventBus();
  const calls = [];
  events.on('content.render', async(value) => { calls.push('late'); return `${value}-late` }, {priority: 20});
  events.on('content.render', async(value) => { calls.push('early'); return `${value}-early` }, {priority: 10});
  assert.equal(await events.filter('content.render', 'content', {}), 'content-early-late');
  assert.deepEqual(calls, ['early', 'late']);
});

test('listener errors are isolated unless failFast is requested', async() => {
  const errors = [];
  const events = new EventBus({onError: error => errors.push(error)});
  events.on('ready', () => { throw new Error('broken plugin') }, {pluginId: 'broken'});
  events.on('ready', () => { errors.push('continued') }, {pluginId: 'healthy'});
  await events.emit('ready', {});
  assert.equal(errors.length, 2);
  await assert.rejects(events.emit('ready', {}, {failFast: true}), /broken plugin/);
});

test('plugin listeners can be removed by plugin id', async() => {
  const events = new EventBus();
  let count = 0;
  events.on('ready', () => { count += 1 }, {pluginId: 'example'});
  events.removePlugin('example');
  await events.emit('ready', {});
  assert.equal(count, 0);
});
