// invoked in master
const crontab = require('node-crontab');
require('./worker.js');

if (!think.cli) {
  const syncComment = () => {
    if (!firekylin.isInstalled) {
      return;
    }
    think.http('/crontab/sync_comment', true);
  };
  crontab.scheduleJob('0 */1 * * *', syncComment);

  // 服务启动时同步一次
  syncComment();
}
