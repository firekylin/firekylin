module.exports = [
  // [/^admin/, 'admin'],

  [/^cate\/(.+)(?:\.html|\.json)$/i, 'post/list?cate=:1'],
  [/^tag\/(.+)(?:\.html|\.json)$/i, 'post/list?tag=:1'],
  [/^author\/([^/]+)(?:\.html|\.json)$/i, 'post/list?name=:1'],
  [/^tags(?:\.html|\.json)$/i, 'post/tag'],
  [/^search(?:\.html|\.json)$/i, 'post/search'],
  [/^page\/([^/]+)(?:\.html|\.json)$/i, 'post/page?pathname=:1'],
  [/^post\/([^/]+)(?:\.html|\.json)$/i, 'post/detail?pathname=:1'],

  [/^about\/?$/i, 'post/page?pathname=about'],
  [/^archives\/?$/i, 'post/archive'],
  [/^cate\/(.+)\/?$/i, 'post/list?cate=:1'],
  [/^tag\/(.+)\/?$/i, 'post/list?tag=:1'],
  [/^author\/([^/]+)\/?$/i, 'post/list?name=:1'],
  [/^tags\/?$/i, 'post/tag'],
  [/^links\/?$/i, 'post/page?pathname=links'],
  [/^rss(?:\.xml)?\/?$/i, 'index/rss'],
  [/^sitemap(?:\.xml)?\/?$/i, 'index/sitemap'],
  [/^search\/?$/i, 'post/search'],
  [/^page\/([^/]+)\/?$/i, 'post/page?pathname=:1'],
  [/^post\/sitemap\/?$/i, 'post/sitemap'],
  [/^post\/([^/]+)\/?$/i, 'post/detail?pathname=:1'],
  ['opensearch.xml', 'index/opensearch']
];
