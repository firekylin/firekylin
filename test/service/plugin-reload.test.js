'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {schedulePluginReload} = require('../../src/service/plugin-reload');

function fixture(overrides = {}) {
  const calls = [];
  const errors = [];
  const response = new EventEmitter();
  const runtime = {env: {THINK_WORKERS: '1'}, connected: true,
    send: (...args) => calls.push(args), ...overrides};
  const options = {worker: true, runtime, logger: {error: value => errors.push(value)}};
  return {response, options, calls, errors};
}

test('reload is scheduled after response finish and sends the all-worker protocol once', () => {
  const {response, options, calls} = fixture();
  assert.deepEqual(schedulePluginReload(response, options), {restartRequired: false, restartScheduled: true});
  assert.equal(calls.length, 0);
  response.emit('finish');
  response.emit('close');
  response.emit('finish');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'think-cluster-reload-workers');
  assert.equal(response.listenerCount('close'), 0);
});

test('error responses do not reload', () => {
  const {response, options, calls} = fixture();
  schedulePluginReload(response, options);
  response.statusCode = 500;
  response.emit('finish');
  assert.equal(calls.length, 0);
});

test('aborted responses do not reload or leave listeners', () => {
  const {response, options, calls} = fixture();
  schedulePluginReload(response, options);
  response.emit('close');
  response.emit('finish');
  assert.equal(calls.length, 0);
  assert.equal(response.listenerCount('finish'), 0);
});

test('single-process, generic IPC, serverless, disconnected, and unusable responses require manual restart', () => {
  for (const override of [{env: {}}, {env: {THINK_WORKERS: '0'}},
    {env: {THINK_WORKERS: '2', VERCEL: '1'}}, {connected: false}, {send: undefined}]) {
    const {response, options, calls} = fixture(override);
    assert.equal(schedulePluginReload(response, options).restartRequired, true);
    response.emit('finish');
    assert.equal(calls.length, 0);
  }
  const {response, options} = fixture();
  assert.equal(schedulePluginReload(response, {...options, worker: false}).restartRequired, true);
  assert.equal(schedulePluginReload(undefined, options).restartRequired, true);
  response.destroyed = true;
  assert.equal(schedulePluginReload(response, options).restartRequired, true);
});

test('IPC failures are logged without an uncaught exception or automatic retry loop', () => {
  for (const mode of ['throw', 'callback', 'disconnect']) {
    const {response, options, calls, errors} = fixture();
    options.runtime.send = (message, callback) => {
      calls.push(message);
      const error = new Error('closed');
      if (mode === 'throw') throw error;
      callback(error);
    };
    schedulePluginReload(response, options);
    if (mode === 'disconnect') options.runtime.connected = false;
    assert.doesNotThrow(() => response.emit('finish'));
    response.emit('finish');
    assert.equal(errors.length, 1);
    assert.match(errors[0], /restart Firekylin manually/);
    assert.equal(calls.length, mode === 'disconnect' ? 0 : 1);
  }
});
