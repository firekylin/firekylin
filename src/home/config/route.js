/**
 * route
 */
export default [
  [/^about/, 'post/page?pathname=about'],
  [/^archives/, 'post/archive'],
  [/^cate\/(.+)/, 'post/list?cate=:1'],
  [/^tags\/(.+)/, 'post/list?tag=:1'],
  [/^tags/, 'post/tag'],
  [/^links/, 'post/page?pathname=links'],
  [/^rss/, 'index/rss'],
  [/^sitemap/, 'index/sitemap'],
  [/^search/, 'post/search'],
  [/^page\/([^/]+)/, 'post/page?pathname=:1'],
  [/^post\/sitemap/, 'post/sitemap'],
  [/^post\/([^/]+)/, 'post/detail?pathname=:1']  
];