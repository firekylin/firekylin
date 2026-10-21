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

## Built-in ability layout

Built-in definitions live under `src/ability`, grouped by domain. Public post
abilities are split into `content/posts/list.js`, `get.js`, and `search.js`;
managed post reads are split into `management/posts/list-managed.js` and
`get-managed.js`; media upload lives in `media/upload.js`. The remaining
management abilities are registered from `management/index.js` while sharing
the existing command/query services.

The worker imports these modules directly and registers them in
`pluginManager.abilities`. Files in `src/plugin/*-tools.js` only re-export the
new modules so old imports keep working. `ToolRegistry` remains a compatibility
import of `AbilityRegistry`; it does not own another registry or execution path.

## Admin and MCP adapters

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
while every built-in executor also validates direct internal input. The registry
keeps transport validation separate from business authorization and ownership.
