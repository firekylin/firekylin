module.exports = think.env === 'now' ? [] : [{
  type: 'one',
  interval: 1 * 60 * 1000,
  handle: 'crontab/sync_comment'
}, {
  type: 'one',
  interval: 60 * 60 * 1000,
  handle: 'admin/cron/rss'
}];
