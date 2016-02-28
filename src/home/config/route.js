
export default [
  [/^about/, 'post/page?pathname=about'],
  [/^archives/, 'post/archive'],
  [/^tags/, 'post/tag'],
  [/^page\/([^/]+)/, 'post/page?pathname=:1'],
  [/^post\/([^/]+)/, 'post/detail?pathname=:1']  
];