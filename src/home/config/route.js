
export default [
  [/^about/, 'post/page?pathname=about'],
  [/^archive/, 'post/archive'],
  [/^page\/([^/]+)/, 'post/page?pathname=:1'],
  [/^post\/([^/]+)/, 'post/detail?pathname=:1']  
];