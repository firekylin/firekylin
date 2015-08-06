export default [
  [/^$/, "post/"],
  [/^post\/(.*)$/, 'post/index/:1'],
  [/^atom(\.xml)?\/?$/, 'web/rss/atom']
]