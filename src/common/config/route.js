export default [
  //[/^admin$/, 'admin/index/redirect'],
  [/^admin\/(?!api).*$/, 'admin/index'],
  [/^admin\/api\/(\w+?)(?:\/(\d*))?$/, 'admin/:1?id=:2&resource=:1']
]