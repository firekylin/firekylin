export default [
  [/^$/, "post/"],
  [/^post\/(.*)$/, 'post/:1'],
  [/^atom(\.xml)?\/?$/, 'web/rss/atom']
]