'use strict';
const cluster = require('node:cluster');
const http = require('node:http');
const {createRequire} = require('node:module');
const thinkRequire = createRequire(require.resolve('thinkjs'));
const {Master, Worker} = thinkRequire('think-cluster');
const {schedulePluginReload} = require('../../../src/service/plugin-reload');

if (cluster.isPrimary) {
  let port;
  cluster.on('listening', (worker, address) => { port = address.port });
  process.on('message', message => {
    if (message === 'snapshot') process.send({port, pids: Object.values(cluster.workers)
      .filter(worker => worker.state === 'listening').map(worker => worker.process.pid)});
  });
  new Master({workers: Number(process.env.RELOAD_TEST_WORKERS), port: 0, host: '127.0.0.1'})
    .startServer().then(() => process.send({ready: true, port}));
} else {
  new Worker({port: 0, host: '127.0.0.1', createServer: () => http.createServer((req, res) => {
    const data = req.url === '/change' ? schedulePluginReload(res) : {pid: process.pid};
    res.setHeader('Connection', 'close');
    res.end(JSON.stringify(data));
  })}).startServer();
}
