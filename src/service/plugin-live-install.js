'use strict';

const cluster = require('node:cluster');
const fs = require('node:fs');
const {readManifest} = require('../plugin/manager');

// Activate locally only when this is the sole request-serving process.
function supportsLiveActivation({runtime = process, worker = cluster.isWorker} = {}) {
  const standalone = !worker && !runtime.send && !runtime.env.THINK_WORKERS;
  const singleWorker = worker && runtime.env.THINK_WORKERS === '1' && runtime.connected === true;
  return !runtime.env.VERCEL && !runtime.env.NODE_APP_INSTANCE && (standalone || singleWorker);
}

async function activateInstalledPlugin(manager, root, options = {}) {
  const fallback = {restartRequired: true};
  if (!supportsLiveActivation(options) || !manager) return fallback;
  try {
    root = fs.realpathSync(root);
    const manifest = readManifest(root);
    // Never reload previously evaluated code, including failed or inactive records.
    if (manager.plugins.has(manifest.id)) return fallback;
    const enabled = manager.stateStore ? await manager.stateStore.enabled(manifest.id) : true;
    manager.states.set(manifest.id, {enabled, version: manifest.version});
    if (!enabled) return {restartRequired: false, restartScheduled: false};
    const record = manager.loadManifest(root);
    await manager.activate(record);
    if (record.status !== 'active') return fallback;
    return {restartRequired: false, restartScheduled: false};
  } catch (error) {
    const logger = options.logger || global.think?.logger;
    logger?.error?.(`[plugin] Live activation failed: ${error.message}`);
    return fallback;
  }
}

async function installPlugin(installer, manager, name, version, options = {}) {
  const live = supportsLiveActivation(options);
  const logger = options.logger || global.think?.logger;
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
    return {...result, ...await activateInstalledPlugin(manager, roots[0], options)};
  } catch (error) {
    // Installation succeeded on disk. Activation failure must retain restart guidance.
    logger?.error?.(`[plugin] Live activation failed: ${error.message}`);
    return result;
  }
}

module.exports = {installPlugin, activateInstalledPlugin};
