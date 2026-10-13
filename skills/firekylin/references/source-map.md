# Source map and skill maintenance

Paths are relative to the core repository. A copied skill needs separately obtained matching source. Baseline: master d3d00ec, 2026-10-13, package.json 2.8.0. This identifies source, not capabilities of published same-version packages.

| Capability | Implementation/validation |
| --- | --- |
| CLI, initialization, project mode | bin/firekylin.js, lib/cli.js, lib/installer.js, lib/project-context.js, lib/start.js; test/cli/ |
| Database/runtime configuration | src/config/adapter.js, src/config/adapter/model.js, src/config/; legacy local src/config/db.js is not distributed; project firekylin.config.js |
| Admin accounts/JWT/import ownership | src/controller/admin/, src/service/admin-auth.js; docs/admin-jwt.md, test/service/admin-auth.test.js, test/service/hugo-import.test.js, test/plugin/jwt-route.test.js |
| Posts/pages/taxonomy/comments | src/model/, src/controller/admin/api/; preserve model/service lifecycles |
| Markdown/rendering | src/model/post.js, templates, Widget rendering; filters/trusted HTML |
| Import/export/RSS/push | src/service/import/, src/service/export/, src/controller/admin/cron.js, relevant admin APIs |
| Upload/storage | src/controller/admin/api/file.js, src/service/upload/, src/plugin/media-tools.js |
| Themes/public pages | src/controller/index.js, post.js, base.js, src/widget/, www/theme/firekylin/; test/widget/ |
| Plugin lifecycle/discovery | src/plugin/manager.js, runtime.js; docs/plugins.md, test/plugin/ |
| Hooks/routes/templates | src/plugin/events.js, routes.js, middleware.js, templates.js; types/ |
| Tools/ownership | src/plugin/tools.js, content-tools.js, management-tools.js, media-tools.js |
| MCP bridge/filtering | src/mcp/server.js, middleware.js, config.js; MCP tests in test/plugin/ |
| OAuth authentication/schema/store/endpoints | src/mcp/oauth-auth.js, oauth-schema.js, oauth-store.js, oauth-utils.js, oauth.js, oauth-middleware.js |
| Vercel/packaging/releases | lib/vercel-static.js, deployment configuration/entrypoints, Dockerfile, .github/workflows/, packaging scripts |
| Engineering constraints | package.json, pnpm-lock.yaml, pnpm-workspace.yaml, ESLint configuration, test/types/ |

## Updating the skill

1. Inspect implementation/tests/runtime results; distinguish old docs, current source, and published artifacts.
2. For tool changes, run the [export script](../scripts/export-tools.cjs), update [tools.json](tools.json) and [MCP reference](mcp-tools.md), and review scopes/runtime authorization/hidden tools.
3. For theme/Widget changes, check FieldAccessor/cursors/cache/escaping and render examples with real Eta.
4. For OAuth/roles, update user/maintainer/protocol guides. Local tests do not establish production compatibility with every client.
5. Keep the entry concise and details in role guides. Relative skill links must survive copying the entire directory.
6. Verify package inclusion. Source updates do not imply npm/Docker publication.

Export public structures and synthetic examples only, never real tokens, user content, or connection credentials.
