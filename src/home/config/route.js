/**
 * route
 */
export default [
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
