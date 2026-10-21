# Ability Registry (experimental)

Firekylin has a single transport-neutral Ability Registry, available as
`global.firekylin.plugins.abilities`. For existing plugins and the MCP server,
`global.firekylin.plugins.tools` is a compatibility alias to the **same instance**.

Abilities are registered once, with a name, description, JSON input schema,
permission requirements, and an executor. Each ability can explicitly select
which channels are allowed to discover and execute it. Existing tools default
to MCP visibility to avoid breaking installed plugins; new internal-only
abilities should use `expose: {admin: true, mcp: false}`.

```js
const registry = global.firekylin.plugins.abilities;

registry.register({
  name: 'example.read',
  description: 'Read an example',
  expose: {admin: true, mcp: false},
  requiredPermissions: ['posts:manage:read'],
  inputSchema: {
    type: 'object',
    properties: {id: {type: 'integer', minimum: 1}},
    required: ['id'],
    additionalProperties: false
  },
  async execute({id}, context) {
    return {id, actor: context.principal.id};
  }
}, 'example');
```

`registry.list({channel: 'mcp'})` returns only MCP-exposed definitions;
`registry.get(name)` returns metadata without the executor.
`registry.execute(name, input, {channel, principal, authorize, approve})`
checks visibility, permissions and explicit approval before calling an executor.

## Admin and MCP post reads

The admin post list/detail API now calls the registered
`posts.list_managed` and `posts.get_managed` abilities, rather than
directly constructing a separate query service. Both adapters reuse
`PostQueryService` for filtering, access control and database reads.

The admin adapter retains its existing response structure (pagination and
editable post options), while the MCP adapter only returns allowlisted fields.
MCP never receives the raw post options/password hash from the admin path.
Session authentication and the existing HTTP response/error contract remain
in the admin controller; OAuth scopes and approval continue to apply to MCP.

**Security:** `authorize` must be supplied by the trusted transport adapter,
not request parameters. Setting `channel: 'admin'` or `channel: 'mcp'` is not
an authentication mechanism. Existing business resource/ownership checks must
still run inside the ability/service. Schemas are exposed to MCP for validation,
but direct internal callers must provide validated inputs; the registry does not
yet implement a universal JSON Schema validator.

Next steps: extend the same approach to write operations, expose a native
Ability API to plugins, and add central input validation without weakening
backward compatibility with third-party tools.
