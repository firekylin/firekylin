'use strict';

const cluster = require('node:cluster');
const {readManifest} = require('../plugin/manager');

// Explicit opt-in: a local activation cannot synchronize multiple server processes.
async function installPlugin(installer, manager, name, version, {
  runtime = process, worker = cluster.isWorker, logger = global.think?.logger
} = {}) {
  const live = runtime.env.FIREKYLIN_PLUGIN_LIVE_INSTALL === '1' &&
    !runtime.env.VERCEL && !runtime.env.THINK_WORKERS && !worker && !runtime.send;
  let fresh = false;
  if (live && manager) {
    // Inspect before mutation: upgrades must never replace a running module in place.
    try {
      fresh = !manager.discover().some(root => readManifest(root).name === name);
    } catch (error) {
      logger?.error?.(`[plugin] Live installation preflight failed: ${error.message}`);
    }
  }
  const result = await installer.install(name, version);
  if (!fresh) return result;
  try {
    const roots = manager.discoverPackages().filter(root => readManifest(root).name === name);
    if (roots.length !== 1) return result;
    const manifest = readManifest(roots[0]);
    if (manager.plugins.has(manifest.id)) return result;
    const enabled = manager.stateStore ? await manager.stateStore.enabled(manifest.id) : true;
    manager.states.set(manifest.id, {enabled, version: manifest.version});
    if (!enabled) return {...result, restartRequired: false, restartScheduled: false};
    const record = manager.loadManifest(roots[0]);
    await manager.activate(record);
    if (record.status !== 'active') return result;
    return {...result, restartRequired: false, restartScheduled: false};
  } catch (error) {
    // Installation succeeded on disk. Activation failure must retain restart guidance.
    logger?.error?.(`[plugin] Live activation failed: ${error.message}`);
    return result;
  }
}

module.exports = {installPlugin};
