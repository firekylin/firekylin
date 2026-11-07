'use strict';

const cluster = require('node:cluster');

// ThinkJS starts workers through think-cluster, which supplies THINK_WORKERS.
// IPC alone also exists under PM2/fork and does not establish this protocol.
function schedulePluginReload(response, {worker = cluster.isWorker, runtime = process,
  logger = global.think?.logger} = {}) {
  const workers = Number(runtime.env.THINK_WORKERS);
  const supported = !runtime.env.VERCEL && worker && Number.isInteger(workers) && workers > 0 &&
    runtime.connected === true && typeof runtime.send === 'function';
  if (!supported || !response?.once || response.destroyed || response.writableFinished) {
    return {restartRequired: true, restartScheduled: false};
  }

  const report = error => {
    if (error) logger?.error?.(`[plugin] Automatic reload failed; restart Firekylin manually: ${error.message}`);
  };
  const cleanup = () => {
    response.removeListener('finish', reload);
    response.removeListener('close', cleanup);
  };
  const reload = () => {
    cleanup();
    if (response.statusCode >= 400) return;
    // A queued reload is not proof that the new plugin activated successfully.
    try {
      if (!runtime.connected) throw new Error('IPC channel disconnected');
      runtime.send('think-cluster-reload-workers', report);
    } catch (error) { report(error) }
  };
  // Register before success(), which may throw PREVENT_NEXT_PROCESS in ThinkJS.
  // Never restart on an aborted response or retry from worker startup.
  response.once('finish', reload);
  response.once('close', cleanup);
  return {restartRequired: false, restartScheduled: true};
}

module.exports = {schedulePluginReload};
