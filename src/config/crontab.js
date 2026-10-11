module.exports = think.env === 'vercel' ? [] : [{
  type: 'one',
  interval: 60 * 60 * 1000,
  handle: 'admin/cron/rss'
}];
