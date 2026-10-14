# MCP, OAuth, and built-in tools

Discover live tools/list and use actual names/inputSchema. [tools.json](tools.json) snapshots 15 source Registry declarations, including remotely hidden tools; it is not a deployed site's tool inventory.

## Connect and authorize

Connect an OAuth-capable remote MCP client to https://your-site/mcp. Let the client initialize/negotiate/discover tools; do not substitute ordinary REST requests for MCP sessions. The server uses the official SDK HTTP handler with JSON/SSE responses.

| Endpoint | Purpose |
| --- | --- |
| /mcp | OAuth-protected MCP transport; POST/GET/DELETE |
| /.well-known/oauth-protected-resource and /mcp suffix | Resource metadata/authorization discovery |
| /.well-known/oauth-authorization-server | Authorization-server metadata |
| /oauth/register | Dynamic client registration |
| /oauth/authorize | Browser JWT login, consent, request-bound PKCE authorization code |
| /oauth/token | Code exchange and refresh rotation |
| /oauth/revoke | Revoke supplied token |

Only active administrator/editor accounts (type 1/2) can authorize; anonymous users/commenters cannot. site_url must be canonical; production HTTPS, with implementation-defined loopback HTTP exceptions. Admin Cookies are not MCP bearer tokens.

Authorization needs state, resource, client_id, redirect_uri, scope, and PKCE S256. Clients must validate state/metadata. Current code/consent TTL=600 seconds, access=1 hour, refresh=30 days. Refresh rotates on single use; it does not guarantee old access-token revocation. Registration allows supported HTTPS/loopback redirects, up to 5 URIs. IP registration rate limiting is process-local, not globally distributed.

Fixed scopes: posts:read, posts:manage:read, posts:write, posts:publish, posts:delete, taxonomy:read, comments:read, comments:moderate, media:write. Plugin scopes do not automatically enter the allowlist. Editors cannot receive administrator publish/delete/comment scopes; tools additionally enforce ownership/live role.

## Tool inventory

“Discoverable” still depends on scope/role/configuration. **Hidden** means the current remote server always excludes requiresApproval tools. Those declarations document internal implementation only; do not bypass the policy.

| Tool | Scope | Remote | Arguments/results |
| --- | --- | --- | --- |
| posts.list | posts:read | Discoverable | page=1 (1..10000), limit=10 (1..50); public summaries |
| posts.get | posts:read | Discoverable | Positive id; public summary/Markdown, null if absent |
| posts.search | posts:read | Discoverable | Nonempty query 1..120 chars, limit=10 (1..50); public matches |
| posts.list_managed | posts:manage:read | Discoverable | page=1, limit=15 (1..100), optional status 0..4/keyword <=120; {count,data}, excludes trash by default |
| posts.get_managed | posts:manage:read | Discoverable | id; Markdown/status/is_public; missing object errors, non-admin own posts only |
| posts.create_draft | posts:write | Discoverable | Required title/pathname/markdown_content; current user's private draft, numeric ID |
| posts.update_draft | posts:write | Discoverable | id plus at least one content field; owned/authorized draft only; {id,affectedRows} |
| posts.update | posts:write | **Hidden** | id plus content changes; published editor changes may enter review |
| posts.publish | posts:publish | **Hidden** | Administrator id; status=3, does not alter is_public/publication time |
| posts.delete | posts:delete | **Hidden** | id; permanent deletion, not trash |
| categories.list | taxonomy:read | Discoverable | {}; id/name/pathname/pid list |
| tags.list | taxonomy:read | Discoverable | {}; id/name/pathname list |
| comments.list | comments:read | Discoverable | Administrator; page=1, limit=20 (1..100), approved/waiting/spam status; excludes email |
| comments.approve | comments:moderate | **Hidden** | Administrator id; approve waiting comment |
| media.upload | media:write | Discoverable | name/format/base64; uploader URL |

Read [tools.json](tools.json) for exact required fields, additionalProperties, types, bounds, and descriptions. Runtime validation adds constraints beyond schemas: safe positive integer IDs, title/pathname <=255 chars, nonempty Markdown <=1 million chars. Do not pass undeclared category/status/userid to draft tools.

Public posts require type=0/status=3/is_public=1/time<=now. Managed reads include drafts but do not grant access to other authors. Public list/search results differ from managed {count,data}; do not assume identical pagination.

## Calling patterns

These JSON snippets are tool **arguments**, not POST /mcp wire messages. Client tool names may include connection prefixes.

Public reads: list/search, then get using returned IDs.

```json
{"query":"deployment","limit":10}
```

Drafts: list_managed to check existing pathname, get_managed to inspect state/ownership, create/update, then re-read the actual ID.

```json
{"title":"Deployment notes","pathname":"deployment-notes","markdown_content":"# Deployment notes\n\nContent to organize."}
```

```json
{"id":123,"markdown_content":"# Deployment notes\n\nVerified content."}
```

The latter examples target create_draft and update_draft. Replace 123 with the real ID. Duplicate pathname, unauthorized objects, and non-drafts fail; do not overwrite, randomize pathname, or switch to hidden tools automatically. Without managed-read scope, report verification limits. Public get cannot read a private draft, which does not mean saving failed.

For media.upload: name is a 1..100 character alphanumeric/underscore/hyphen stem without extension. format is png/jpeg/gif. Raw base64, no data URL; signature checks apply, decoded <=5 MiB, encoded <=7 MiB. Remote URLs are not accepted. Verify the returned URL before inserting Markdown; use authorized admin features for other formats, not an invented media.fetch.

SDK results use content text blocks, usually JSON-serialized business values. Check isError and parse values before proceeding. Errors may be generic: distinguish empty lists, null, protocol failures, and business failures. Admin errno conventions do not define MCP wire format.

## Troubleshooting and boundaries

- 401: expired/revoked token, disabled user, authentication failure; refresh/reauthorize normally, not with admin Cookies.
- 403: scope/live role/Origin/HTTPS; obtain privileges through normal authorization, not token database edits.
- 404: version/mcp.enabled/proxy path; not every 2.8.0 artifact includes this implementation.
- POST 415/413: JSON Content-Type/request size; transport currently limits 8 MiB, uploads have smaller constraints.
- OAuth 400: redirect/resource/PKCE/state/code binding; preserve validation.
- Missing publish/delete/approve: hidden policy; use authorized admin operations or deliver reviewable drafts.
- Missing plugin tools: loading/naming/scopes/approval flags; lowercase IDs and no core:* ownership impersonation.

MCP does not cover page creation, taxonomy writes, site settings, account management, backups, or arbitrary imports. Use the appropriate admin/file/maintenance workflow.

## Update metadata

From trusted core source:

```sh
node skills/firekylin/scripts/export-tools.cjs > skills/firekylin/references/tools.json
```

After copying the skill, explicitly supply trusted source:

```sh
node /path/to/skill/scripts/export-tools.cjs /path/to/firekylin > /path/to/skill/references/tools.json
```

The script loads registration code and exports metadata without database/upload/tool execution. It does not discover deployed plugins or user/scope-filtered client tools. Review runtime limits, OAuth policy, and role guides after regenerating JSON.
