# System maintainers

Read [SKILL.md](../SKILL.md) first. This role covers installation, operations, backups, authentication, databases, and releases; account management still requires real administrator privileges.

## Identify deployment mode

| Mode | Configuration/data | Entry point |
| --- | --- | --- |
| Independent CLI project | firekylin.config.js, themes/, plugins/, data/, uploads | npm start / npm run dev; core in node_modules/firekylin |
| Core source / legacy install | src/config/, www/, runtime directories; possible FK_DB_* overrides | pnpm start backend; pnpm dev Vite admin UI |
| Current Dockerfile | /opt/firekylin application, /var/lib/firekylin persistence, port 8360 | Verify volumes/configuration/entrypoint; do not assume independent-project layout |
| Vercel | Project configuration, external database/storage, static artifacts | Verify serverless limits; writable local files are not durable storage |

Current core requires Node `^22.13.0 || >=24` and pins pnpm 12.11.2. Follow the target checkout's engines/packageManager/lockfile/CI. Old README badges and pkg node10 targets are not current requirements. Backend defaults to 8360; Vite defaults to 3000.

## Install a site

Choose a trusted version that actually includes required capabilities. The skill baseline still declares 2.8.0; a published package with that number may lack MCP.

```sh
npx firekylin new my-blog
cd my-blog
npm start
```

Prefer interactive credential entry over passwords in shell history. Supported initialization databases: SQLite, MySQL, TiDB, PostgreSQL. TiDB uses the MySQL protocol with TLS certificate verification. Verify homepage, admin login, draft saving, uploads, and persistence.

- --skip-install requires dependency installation afterwards.
- --skip-initialize creates/marks a scaffold only: no database connection/tables/admin creation. Startup alone does not prove initialization.
- Interrupted initialization may leave data/.firekylin-initializing.json containing secrets. Restrict access; do not paste it into logs/tickets.
- Use the existing package manager for each project, avoiding mixed lockfiles. When upgrading pnpm, align packageManager, workflows, and installation commands.

## Configuration, databases, migration

Independent projects read firekylin.config.js; legacy installs read core configuration. Verify lib/project-context.js mode selection and src/config/adapter.js/model adapter behavior. Report only necessary non-sensitive diagnostics.

Legacy overrides may include FK_DB_MODE/HOST/PORT/DATABASE/USER/PASSWORD/PREFIX/ENCODING/PATH. Check presence without dumping variables. Resolve actual SQLite directory/filename from adapter behavior rather than guessing.

Record database type/version/prefix/encoding/schema before migration. TiDB uses MySQL dialect. An empty existing prefix is legitimate; do not silently replace it with fk_. CLI defaults and existing-database migration are different operations.

OAuth adds persistent tables. Inspect src/mcp/oauth-schema.js schema initialization/ensure logic and verify on a backup copy or test database before the deployment's supported migration process. Distinguish SQL generation checks from real database validation. Do not guess production ALTER/DELETE statements to suppress errors.

## Backup, upgrade, rollback

Business exports do not replace complete backups. Include:

1. Consistent database snapshot. For SQLite, use an appropriate consistent backup method; copying only an active main file can omit WAL data.
2. Configuration/keys, custom themes/plugins, uploads or object-storage objects. Encrypt and restrict secret backups separately.
3. Deployment definitions, dependencies/lockfiles, core version/commit, volumes, and restoration instructions.

Verify restoration. Upgrade independent projects by updating the firekylin dependency while preserving project files/data. Do not maintain long-term node_modules edits; pin traceable patches. Legacy admin system upgrade downloads/overwrites release archives and is not automatically appropriate for independent npm projects. Check source, integrity, and overwrite scope before selecting an upgrade path.

Restore/upgrade in a test environment and check public pages/admin/content/comments/uploads/extensions/MCP login and writes. Carry forward existing deployment authorization; otherwise prepare a reviewable change and rollback plan. Distinguish code rollback from database restoration; old dependencies may not support upgraded schemas.

## MCP/OAuth operations

Verify OAuth-capable deployed code rather than using legacy mcp.tokens instructions. Project configuration fragment:

```js
module.exports = {
  // Preserve existing database, server, theme, and plugin configuration.
  mcp: {
    enabled: true,
    requireHttps: true,
    allowedOrigins: ['https://your-mcp-client.example']
  }
};
```

This illustrates fields, not a replacement configuration file. Legacy mode uses think.config('mcp'). allowedOrigins restricts browser Origin; it does not replace token authentication. Non-browser requests without Origin still require authentication.

- site_url is a canonical origin such as https://blog.example.com, without path/query/fragment. Production uses HTTPS; HTTP exceptions apply only to supported loopback addresses.
- Configure proxies so the application recognizes protocol/origin. Do not disable HTTPS checks or trust arbitrary Host headers to work around configuration.
- Clients connect /mcp and use discovery, browser admin JWT login, consent, and PKCE S256. See [MCP reference](mcp-tools.md).
- Codes, consent, access tokens, and refresh tokens have different lifetimes. Refresh tokens rotate with single use; revoking one token does not revoke all related tokens.
- OAuth checks live user status/role on authentication. Admin JWT expiration/key policy is separate. Admin logout does not revoke MCP tokens.
- Log necessary status/request IDs/tool names/error categories; omit Authorization, Cookies, full request bodies, and credentials.

## Troubleshooting

| Symptom | Inspect | Verify |
| --- | --- | --- |
| Startup failure | Node/dependencies/native SQLite/config mode/database/permissions | Actual HTTP and database operations |
| Admin login failure | Account type/status/password/2FA/LDAP/Cookie HTTPS/domain/JWT | Full browser login, not only password checks |
| MCP 404 | Code version/enabled/proxy path | Client initializes/discovers tools |
| MCP 401 | Expiration/revocation/refresh rotation/disabled user | Normal refresh or reauthorization works |
| MCP 403 | HTTPS/Origin/role/scope/resource permissions | Authorized calls work; unauthorized calls still fail |
| Missing tools | Live tools/list/scopes/role/requiresApproval | Actual exposed names; no policy bypass |
| Tool failure | MCP isError/business errors; admin errno despite HTTP 200 | Re-read object/result |
| Upload failure | Size/format/provider permissions/object URL | Readable object without secret exposure |
| Inactive plugin | Discovery/manifest/activation logs/conflicts/reload | Actual extension works without duplicate registrations |
| Duplicate import/RSS | Format/pathname/schedules/source/batch state | Small reproduction and object/publication counts |

RSS cron runs in ordinary mode but is disabled in Vercel mode; auto-import can publish content. Avoid duplicate tasks after restore/migration. Vercel static builds prepare resources only; dynamic service still needs database/storage/stable authentication configuration.

## Core development and CI

Install a trusted checkout using its pinned tools, without committing secrets:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm test:plugin
pnpm test:widget
pnpm test:auth
pnpm test:cli
pnpm test:types
```

Choose checks appropriate to changes; this full checklist does not require rerunning everything for small documentation edits. Database/model changes may also need `node --test test/service/*.test.js` and target-database integration. pre-commit runs lint; do not bypass it to hide errors.

| Workflow | Responsibility |
| --- | --- |
| test | Push/PR, Node 22/24 installation/build/lint/tests |
| Docker build validation | PR commits, amd64/arm64 builds without push |
| Docker release | master package.json changes; version differing from event.before triggers version/latest push |
| npm publication | master version changes subject to workflow conditions |
| release | Its own version comparisons/release-artifact conditions, separate from Docker/npm |

“Version differs” is not a strict SemVer increase. Before publishing check version/changelog/lockfile/artifact contents/secret bindings. Image build success does not prove startup: smoke-test entrypoint dependencies, volumes, HTTP, database, and extension loading. npm pack --dry-run checks CLI lib/, types, and skill files. Old pkg targets do not demonstrate modern Node compatibility.

Report exact versions, validation scope, deployment state, and rollback evidence. Distinguish PR creation, merging, deployment, and publication.
