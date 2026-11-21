# Native desktop content API v1

This API supports the independent macOS, Windows and GNOME clients (F01–F09). It is separate from MCP and the cookie-authenticated administration API. Existing browser login, CAPTCHA, two-factor authentication and consent remain in the browser. Never send MCP grants to this resource or reuse browser cookies in a desktop client.

## Deployment and migration

Deploy this backend change before attempting a client connection. A package version alone is not compatibility evidence: clients require `GET /desktop/v1/discovery` with `apiVersion: 1`, the exact origin/resource, and revision/idempotency support. HTTPS is required, except explicit loopback development. Deployment under a URL subpath is not supported by v1; discovery declares this limitation. Redirects must not forward bearer credentials.

Migration `060-desktop` adds an integer revision to posts, a durable `desktop_operation` table, and a unique pathname index. Back up the database before upgrading. Existing duplicate, non-null pathnames stop migration with an explicit error; no content is renamed or deleted. Resolve duplicates deliberately before retrying. The migration is repeatable. SQLite is integration-tested; MySQL/TiDB/PostgreSQL statements are provided but have not been exercised against live servers in this change. All Post model updates, including browser edits, advance revisions.

Operation results can contain private content. Protect the operation table as carefully as the post table and include it in database backups. Records currently have no automatic expiry: deleting them would invalidate retry guarantees for old client outboxes. Do not clear pending records to force retries.

## Authorization

- Protected resource: the configured origin plus `/desktop/v1`.
- Scope: `desktop:content`; active administrators, editors and contributors only.
- Resource metadata: `/.well-known/oauth-protected-resource/desktop/v1`.
- Authorization metadata: `/.well-known/oauth-authorization-server/desktop`.
- OAuth endpoints: `/desktop/oauth/register`, `/authorize`, `/token`, `/revoke` under that prefix.
- Public native clients use authorization code, S256 PKCE, a random state and an ephemeral loopback callback. Registration and OAuth validation reuse the existing hardened OAuth implementation.
- Bearer verification reloads the current account and role. Disabled/comment-only accounts cannot use the API. A desktop token is not valid for MCP and an MCP token is not valid here.

`GET /desktop/v1/identity` returns `id`, `name`, `avatar`, `role`, `siteName`, `siteURL`, `settingsURL` and operation `capabilities`. Identity and a permitted content read must both succeed before displaying a verified connection. Administrator settings open `/admin/options/general`; other accounts open `/admin`. The browser may require its own login.

## Routes and permissions

All paths below are relative to `/desktop/v1`. Requests and responses use JSON. Errors use `{ "error": "STABLE_CODE" }` and a meaningful HTTP status. A maximum of 8 MiB is accepted per JSON request.

| Route | Method | Behavior |
|---|---|---|
| `discovery` | GET | Public API compatibility and upload limits |
| `identity` | GET | Current identity and permissions |
| `articles`, `pages` | GET | Search title/Markdown, status filter, 30-item pages, update time then ID descending |
| `articles/:id`, `pages/:id` | GET | Complete Markdown, attributes, revision and capabilities; type is checked |
| `articles`, `pages` | POST | Create one document |
| `articles/:id`, `pages/:id` | PUT | Conditional update using `revision` |
| `articles/:id`, `pages/:id` | DELETE | Conditional deletion using `revision`, normal lifecycle hooks |
| `taxonomy` | GET | Existing category/tag IDs and names |
| `comments` | GET | Search comment body; waiting/approved/spam/all; 30-item pages |
| `comments/:id` | POST | `action`: approved, waiting, spam, reply, delete; reply also requires `body` |
| `media` | GET | Search filename; 30-item pages, newest first |
| `media` | POST | Upload `name` and `base64`; server determines MIME |
| `media/:id` | DELETE | Remove attachment catalog entry; stored object is retained |
| `operations/:key` | GET | Account-scoped completed/failed/pending outcome |

Administrators can access all content. Editors and contributors can access their own articles/pages and submit them for review, but cannot publish. Comments and media require administrator/editor status; editors are restricted to their own media and comments on their own posts. Server checks are authoritative even if client controls are visible.

Document writes accept only `title`, `body`, `pathname`, `visibility`, `comments`, `summary`, `cover`, `categories`, `tags`, `revision`, `action`. Actions are `save`, `submit`, `publish`, `update`; published content cannot be changed using `save`. Existing password protection and unknown options remain intact; password hashes are never returned. Pages reject taxonomy changes. Pathnames contain Unicode letters/numbers, underscore or dash, maximum 255 characters. Public visibility and comment allowance are independent of status.

Writes claim the supplied revision atomically inside the database transaction before model hooks and relation writes. A stale revision returns `409 REVISION_CONFLICT`. Clients must retain the local copy and reload/export; never replace the baseline and silently retry. Pathname collisions return `PATHNAME_EXISTS` when detected before insertion; an unexpected database collision is an uncertain outcome and must be queried.

Comments use the existing rendering, moderation, notifications and count synchronization services. List responses exclude email/IP. Deletion removes the selected comment only, retains replies, and returns `repliesDeleted: false`. Reply responses report their actual moderation status.

Uploads accept PNG/JPEG/GIF/WebP/PDF/TXT/ZIP/MP3/MP4, at most 5 MiB each. Images are decoded to verify type and dimensions with a 40-million-pixel limit. Caller-supplied MIME is not trusted. Existing configured storage providers and attachment lifecycle hooks are used. Media responses distinguish direct file URLs, dimensions and size. Deletion returns `storedFileRetained: true`; it does not rewrite content or claim files are unused.

## Retry and failure contract

Every mutation requires `Idempotency-Key` (16–100 ASCII letters, digits or dashes). The server binds it to the account and canonical method/path/body. Identical completed requests replay the result; a different request using the same key is rejected. Keys and results survive restart.

An unexpected failure after dispatch leaves the operation `pending`, because a side effect may have happened. It is never automatically repeated. A deterministic business rejection is stored as `failed`. If lookup returns 404, the exact original request with the same key can safely be sent again. A pending outcome can require operator investigation; it is not evidence that nothing was saved. Clients keep the request on disk before sending and block a different mutation until the uncertainty is resolved.

## Evidence

`test/desktop/content.test.js` exercises real SQLite transactions, model hooks, revisions, ownership, fixed types, taxonomy, cover preservation, durable replay, key canonicalization, migration repeatability and legacy duplicate preservation. `test/plugin/mcp-http.test.js` boots a real installed ThinkJS server and tests browser consent, separate MCP/desktop resources, identity, article/page CRUD, conflict rejection, comment moderation/replies, upload MIME, restart recovery and revocation. Existing MCP behavior remains covered.

Client fixture tests verify native PKCE, refresh and outbox recovery independently. Neither fixture tests nor backend integration tests substitute for the three-platform manual installation, accessibility, IME and end-to-end acceptance matrix.
