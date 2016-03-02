
export default [
  [/^about/, 'post/page?pathname=about'],
  [/^archives/, 'post/archive'],
  [/^tags/, 'post/tag'],
  [/^links/, 'post/page?pathname=links'],
  [/^rss/, 'post/rss'],
  [/^search/, 'post/search'],
  [/^page\/([^/]+)/, 'post/page?pathname=:1'],
  [/^post\/sitemap/, 'post/sitemap'],
  [/^post\/([^/]+)/, 'post/detail?pathname=:1']  
];