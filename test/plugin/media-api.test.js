'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const test = require('node:test');
const {PluginManager} = require('../../src/plugin/manager');
const {createPluginMediaApi} = require('../../src/service/plugin-media');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done });
  return {promise, resolve};
}
function input(ownerId = 7) {
  return {data: Buffer.from('OggS-audio'), filename: 'voice.ogg', mime: 'audio/ogg', ownerId};
}
async function harness(options = {}) {
  const calls = [];
  const audits = [];
  const contexts = [];
  const state = {enabled: true, config: {type: 'local'}, user: id => ({id, allowed: true})};
  const mediaApi = createPluginMediaApi({
    getUploadConfig: options.getUploadConfig || (async() => state.config),
    getUser: async id => state.user(id),
    canOwnMedia: user => user.allowed === true,
    audit: options.audit || (entry => audits.push(entry)),
    upload: options.upload || (async value => {
      calls.push({...value, data: await fs.readFile(value.file.path)});
      return {url: '/voice.ogg', id: 11};
    })
  });
  const manager = new PluginManager({mediaApi, logger: {error() {}},
    stateStore: {enabled: async() => state.enabled}});
  const record = {manifest: {id: 'say', permissions: options.permissions || ['media:write']},
    status: 'discovered', plugin: {register: ctx => contexts.push(ctx)}};
  manager.plugins.set('say', record);
  await manager.activate(record);
  return {manager, record, state, calls, audits, contexts};
}

test('media is additive, plugin-bound and checks permissions even when the API is present', async() => {
  const h = await harness({permissions: []});
  assert.ok(h.contexts[0].media);
  await assert.rejects(h.contexts[0].media.upload(input()), {code: 'PLUGIN_MEDIA_DENIED'});
  h.record.manifest.permissions = 'media:write';
  await assert.rejects(h.contexts[0].media.upload(input()), {code: 'PLUGIN_MEDIA_DENIED'});
  h.record.manifest.permissions = ['media:write'];
  h.state.enabled = false;
  await assert.rejects(h.contexts[0].media.upload(input()), {code: 'PLUGIN_MEDIA_DENIED'});
  assert.equal(h.calls.length, 0);
  const legacy = new PluginManager();
  assert.equal(legacy.context(h.record).media, undefined);
});

test('validates authors and payloads before storage, without administrator defaults', async() => {
  const h = await harness();
  const upload = h.contexts[0].media.upload;
  for (const ownerId of [undefined, 0, -1, 'bad']) {
    await assert.rejects(upload({...input(), ownerId}), /Explicit media owner/);
  }
  for (const user of [null, {id: 8, allowed: true}, {id: 7, allowed: false}]) {
    h.state.user = () => user;
    await assert.rejects(upload(input()), {code: 'MEDIA_OWNER_DENIED'});
  }
  for (const value of [{...input(), pluginId: 'admin'}, {...input(), filename: '../secret'},
    {...input(), data: Buffer.alloc(20 * 1024 * 1024 + 1)}, {...input(), mime: 'invalid'}]) {
    await assert.rejects(upload(value), TypeError);
  }
  assert.equal(h.calls.length, 0);
});

test('snapshots each asynchronous caller and loads fresh config without sharing an HTTP identity', async() => {
  const h = await harness();
  const first = input(7);
  const one = h.contexts[0].media.upload(first);
  first.ownerId = 99;
  first.data.fill(0);
  await one;
  h.state.config = {type: 'r2'};
  await h.contexts[0].media.upload(input(8));
  assert.deepEqual(h.calls.map(call => call.userId), [7, 8]);
  assert.equal(h.calls[0].data.toString(), 'OggS-audio');
  assert.deepEqual(h.calls.map(call => call.config.type), ['local', 'r2']);
  assert.notEqual(h.calls[0].config.name, h.calls[1].config.name);
  for (const call of h.calls) await assert.rejects(fs.access(call.file.path), {code: 'ENOENT'});
  assert.deepEqual(h.audits.map(entry => [entry.pluginId, entry.ownerId]), [['say', 7], ['say', 8]]);
});

test('stop during preparation prevents transfer; reactivation never revives a stale handle', async() => {
  const started = deferred();
  const gate = deferred();
  const h = await harness({getUploadConfig: async() => { started.resolve(); return gate.promise; }});
  const old = h.contexts[0].media;
  const result = old.upload(input());
  await started.promise;
  await h.manager.deactivate('say');
  gate.resolve({type: 'local'});
  await assert.rejects(result, {code: 'PLUGIN_MEDIA_DENIED'});
  assert.equal(h.calls.length, 0);
  await h.manager.activate(h.record);
  await assert.rejects(old.upload(input()), {code: 'PLUGIN_MEDIA_DENIED'});
  assert.deepEqual(await h.contexts[1].media.upload(input()), {url: '/voice.ogg', id: 11});
});

test('a started transfer finishes registration after stop, with no new uploads accepted', async() => {
  const started = deferred();
  const gate = deferred();
  let filename;
  const h = await harness({upload: async value => {
    filename = value.file.path; started.resolve(); return gate.promise;
  }});
  const result = h.contexts[0].media.upload(input());
  await started.promise;
  await h.manager.deactivate('say');
  await assert.rejects(h.contexts[0].media.upload(input()), {code: 'PLUGIN_MEDIA_DENIED'});
  gate.resolve({url: '/stored', id: 12});
  assert.deepEqual(await result, {url: '/stored', id: 12});
  await assert.rejects(fs.access(filename), {code: 'ENOENT'});
});

test('partial failures retain their error and log only safe metadata; audit failures do not fail uploads', async() => {
  const failure = Object.assign(new Error('SQL password=private'), {
    code: 'MEDIA_REGISTRATION_FAILED', uploadedUrl: 'https://private.example/object', retryable: false
  });
  let filename;
  const h = await harness({upload: async value => { filename = value.file.path; throw failure; }});
  await assert.rejects(h.contexts[0].media.upload(input()), error => error === failure);
  await assert.rejects(fs.access(filename), {code: 'ENOENT'});
  assert.deepEqual(h.audits, [{pluginId: 'say', ownerId: 7, ok: false, code: 'MEDIA_REGISTRATION_FAILED'}]);
  const successful = await harness({audit: () => { throw new Error('logger failed'); }});
  assert.equal((await successful.contexts[0].media.upload(input())).id, 11);
});
