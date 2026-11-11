# UI internationalization release verification

## Automated checks

Run `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm check:i18n` and `pnpm check:i18n-package` before release. CI validates resource structure and package contents after the production build. Dictionary validation includes duplicate keys, exact placeholder equality and owner-local fallback. Build output contains the React dictionaries; npm packages contain core and bundled-theme dictionaries.

Regression tests exercise literal interpolation, falsy values, unsafe placeholders, escaping, public boot data, independent processes, request snapshots, plugin owner isolation, static registration behavior, theme response copies, comment-language compatibility, Eta caching and asynchronous includes. Existing HTTP/SQLite/plugin/worker tests also run as part of the full suite.

## Upgrade and rollback

Existing databases need no bulk rewrite: absent language state means Chinese. The `locale` option stores the language string directly. Clients compare the language value; request sequencing rejects stale responses. Older releases ignore the extra locale option. Switching back to Chinese does not rewrite articles, theme values or plugin data. Explicit legacy comment languages remain unchanged; only missing/auto values follow the system.

Language changes do not restart workers or rerun plugin registration. Static plugin titles require a safe plugin reload or a manually coordinated worker restart. Dynamic request text follows a request snapshot. Independent plugin tasks must enter `ctx.withLocale` explicitly.

## Release gates still open

These staged PRs remain drafts until the following are completed:

- Finish English UI coverage across remaining admin pages, date widgets, default-theme prose and browser scripts.
- Refresh translated server-provided theme/plugin display data on language changes without discarding forms.
- Verify task propagation across all host-scheduled and MCP extension entry points.
- Verify shared-database multi-container switching, CDN/page-cache invalidation, read-only/serverless deployments and rollback on actual target environments.
- Complete plugin/theme scaffolding examples, deployment-specific diagnostics and resource lifecycle acceptance.

A passing local suite and npm dry-run are not evidence that Docker, PM2, serverless, CDN or production rollout has been exercised. No deployment or automatic restart is part of these PRs.
