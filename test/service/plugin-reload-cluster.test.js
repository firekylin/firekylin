'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {fork} = require('node:child_process');
const {setTimeout: delay} = require('node:timers/promises');

for (const workers of [1, 2]) {
  test(`real ThinkJS master replaces all ${workers} worker(s) after a complete HTTP response`,
    {timeout: 15000, skip: process.platform === 'win32'}, async t => {
      const child = fork(path.join(__dirname, '../fixtures/plugin-reload/server.cjs'), [], {
        detached: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
        env: {...process.env, VERCEL: '', RELOAD_TEST_WORKERS: String(workers)}
      });
      let stderr = '';
      child.stderr.on('data', chunk => { stderr += chunk });
      t.after(() => {
        try { process.kill(-child.pid, 'SIGKILL') } catch (error) { if (error.code !== 'ESRCH') throw error }
      });
      const receive = predicate => new Promise(resolve => {
        const listener = message => {
          if (!predicate(message)) return;
          child.removeListener('message', listener);
          resolve(message);
        };
        child.on('message', listener);
      });
      const ready = await receive(message => message?.ready === true);
      assert.equal(ready.ready, true, stderr);
      const snapshot = async() => {
        const result = receive(message => Array.isArray(message?.pids));
        child.send('snapshot');
        return result;
      };
      const original = await snapshot();
      assert.equal(original.pids.length, workers);
      const response = await fetch(`http://127.0.0.1:${ready.port}/change`);
      assert.deepEqual(await response.json(), {restartRequired: false, restartScheduled: true});
      let current;
      for (let attempt = 0; attempt < 100; attempt++) {
        current = await snapshot();
        if (current.pids.length === workers && current.pids.every(pid => !original.pids.includes(pid))) break;
        await delay(50);
      }
      assert.equal(current.pids.length, workers, stderr);
      assert.ok(current.pids.every(pid => !original.pids.includes(pid)), 'every original worker must be replaced');
      await delay(300);
      assert.deepEqual((await snapshot()).pids, current.pids, 'new workers must not replay the reload');
    });
}
