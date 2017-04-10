/**
 * route
 */
export default [
  [/^cate\/(.+)(?:\.html|\.json)$/, 'post/list?cate=:1'],
  [/^tag\/(.+)(?:\.html|\.json)$/, 'post/list?tag=:1'],
  [/^author\/([^/]+)(?:\.html|\.json)$/, 'post/list?name=:1'],
  [/^tags(?:\.html|\.json)$/, 'post/tag'],
  [/^search(?:\.html|\.json)$/, 'post/search'],
  [/^page\/([^/]+)(?:\.html|\.json)$/, 'post/page?pathname=:1'],
  [/^post\/([^/]+)(?:\.html|\.json)$/, 'post/detail?pathname=:1'],

  [/^about$/, 'post/page?pathname=about'],
  [/^archives$/, 'post/archive'],
  [/^cate\/(.+)$/, 'post/list?cate=:1'],
  [/^tag\/(.+)$/, 'post/list?tag=:1'],
  [/^author\/([^/]+)$/, 'post/list?name=:1'],
  [/^tags$/, 'post/tag'],
  [/^links$/, 'post/page?pathname=links'],
  [/^rss(?:\.xml)?$/, 'index/rss'],
  [/^sitemap(?:\.xml)?$/, 'index/sitemap'],
  [/^search$/, 'post/search'],
  [/^page\/([^/]+)$/, 'post/page?pathname=:1'],
  [/^post\/sitemap$/, 'post/sitemap'],
  [/^post\/([^/]+)$/, 'post/detail?pathname=:1'],
  ['opensearch.xml', 'index/opensearch']
];
