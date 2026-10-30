# Generate a Firekylin plugin

Use this workflow with the `firekylin` Skill when a user describes a feature and wants working plugin files. Follow [developer APIs](developers.md) for contracts. Source checked at `e10a576` (package 2.17.1); verify the target version, not just this snapshot. The scripts and assets travel with the Skill; matching Firekylin source/dependencies are separately required for runtime tests.

## 1. Turn the request into acceptance criteria

Inspect the authorized project, instructions, installed package/lockfile, existing plugins, theme, and configuration first. Ask only questions whose answers affect implementation:

- What triggers the feature, who uses it, what result should they see, and where? Include one concrete input/output example.
- Is the target a local site, core checkout, or remote deployment? What Firekylin/Node version and filesystem access are available?
- Does it read private content, write data, call an external service, need credentials, or require an admin settings page? What persistence, failure and retry behavior is expected?

Reuse answers and authorization from the conversation. State safe defaults (CommonJS, namespaced routes, public data only, no external side effects) and continue independent work. Do not ask a questionnaire when the request already answers it. Record acceptance criteria before implementing.

MCP access alone does not provide filesystem writes, code deployment, or arbitrary plugin creation. Discover the actual remote tools; never invent `plugins.create` or a file-write tool. With file access only, deliver files and deployment steps. Without file access, provide complete file contents and commands and report that no files were written. Installing this Skill grants no site privileges.

## 2. Choose and verify the extension point

| Requirement | Extension / evidence to inspect |
| --- | --- |
| Query data for a theme | Widget; `src/widget/`, visibility-aware PostQueryService/model methods |
| React to lifecycle changes | `ctx.events.on`; verify the exact emit/filter call and payload in the model/service |
| Transform content | Filter returning the new value; inspect rendering/caching and avoid repeated appends |
| Theme helper or insertion | `ctx.templates` functions/filters/slots; verify the active theme actually invokes it |
| HTTP endpoint / webhook | `ctx.routes.register`; routes, middleware, payload limits, auth/CSRF and signature checks |
| Admin page/settings/actions | `ctx.admin`; `src/plugin/admin.js`, `middleware.js`, `docs/plugins.md` |
| AI-callable operation | `ctx.tools` (AbilityRegistry alias); input validation, trusted principal, permissions and approval; separately test MCP exposure |
| AI provider | Check `ctx.ai` availability and `src/ai/` contracts; never assume all contexts have it |

`firekylin plugin <name>` in `lib/cli.js` scaffolds a **Widget entry** and edits project `widgets`. It does not create a PluginManager manifest or `register(ctx)` lifecycle plugin. Use it only for a Widget-only request; do not run it as a full-plugin generator. A full plugin may itself register Widgets through `ctx.widgets.register`. Verify the base class: at this snapshot only `ctx.widgets.Widget` is actually exported to PluginManager; ContentsWidget/MetasWidget are available to project/theme initializer entries instead. See the developer guide caveat.

Inspect `src/plugin/manager.js`, `state-store.js`, `src/bootstrap/worker.js`, selected registries, related tests and target docs before using an API. If an extension point is missing, explain the gap and propose a separate core change; do not invent hooks, configuration setters or service methods. Public content queries must exclude drafts, private, scheduled and unauthorized content. SQL bypassing model lifecycles is not a substitute for a supported write API.

## 3. Generate a complete deliverable

Choose a stable lowercase hyphenated plugin ID; check for existing IDs, routes, Widgets and tool names. Create files in a new output directory, not inside an active production plugins directory. Preserve existing files and project configuration.

For a small working starting point, run the bundled script from its actual installed location:

```sh
node /path/to/firekylin-skill/scripts/scaffold-plugin.cjs /path/to/output/site-message site-message 2.17.1
```

Supply the **verified target version**, not the example version blindly. The script creates a dependency-free message plugin with a read-only JSON route, escaped Eta usage, configuration example and executable tests. It does not install or enable anything. Replace its behavior and tests to fulfill the actual request; the starter alone is not completion for unrelated features.

Deliver:

- `package.json`: CommonJS, name/version, main/entry, `firekylin.type: "plugin"`, stable `firekylin.id`, verified engine constraint and explicit packaged files. No invented minimum-version support.
- Complete entry and any modules/assets; implement `register(ctx)` and lifecycle cleanup for timers/connections. Avoid dependencies unless needed; review their install scripts and pin/lock according to the target project.
- Configuration example with defaults and validation. `ctx.config` is a shallow-frozen view of `pluginConfig[id]`; it is not a persistence API. Merge settings into existing configuration without replacing database/server/theme/Widget settings. Keep secrets out of source and output; use an established credential mechanism only after verifying it.
- README: purpose, compatibility evidence, files, configuration, exact route/template/Widget invocation, installation and explicit enable/restart steps, tests, failure behavior, disable/uninstall/rollback. State any data retained after uninstall.
- Tests for actual behavior, invalid inputs, visibility/auth boundaries, load errors, registration and cleanup. Supply fixtures/stubs for external services, never send real notifications in tests.

Treat plugins as trusted server code, not a sandbox. `manifest.permissions` is mostly metadata (some host APIs have gates); it does not stop filesystem/network access. Review generated code and dependencies before executing. Escape untrusted HTML; raw Eta output/slots require deliberate sanitization. Require `auth: 'admin', csrf: true` on admin writes; public webhooks need bounded input, authentication/signatures, replay protection and idempotency. Set network timeouts and prevent SSRF. Never trust request-supplied roles or approval flags.

## 4. Verify in layers

1. **Static**: review all files, manifest, entry path, dependencies, syntax, config and packaged contents. Run `node scripts/verify-plugin.cjs /path/to/plugin /path/to/firekylin-core` from the Skill directory. This reads files and syntax-checks JavaScript without loading plugin modules; it is not a security audit. It requires the host's installed `semver` dependency. Use `npm pack --dry-run --ignore-scripts` in the plugin and inspect the file list for missing assets and secrets.
2. **Registry integration**: after review, run `FIREKYLIN_CORE=/path/to/firekylin-core node --test /path/to/plugin/test/*.test.cjs`. The starter tests use the real PluginManager, discovery, PluginStateStore, route handler and template context in temporary storage; no fake registry. They test default-disabled, enabled, deactivated and reactivated behavior, configuration failure and compatibility failure. Add tests for each new extension and its cleanup. Manager errors may be logged instead of thrown: assert `status === 'active'` and inspect captured errors. Passing syntax or mocks is not runtime verification.
3. **Live site**: create an isolated disposable project and database using the verified host's CLI/installer, with generated temporary credentials. Copy the plugin, merge config, start on loopback, confirm default-disabled, enable it using the real admin path, restart as needed, and request the exact route/render the actual theme. Assert response content/status; an open port is insufficient. Test unauthorized writes, invalid inputs, repeated events and disable/restart behavior as applicable. Do not borrow production data or change live plugin state for a smoke test. If the environment blocks a step, report precisely which layer passed and what remains unverified.
4. **Project checks**: in a core checkout run relevant `test:plugin`, `test:widget`, `test:cli`, `test:types` and lint; run build when frontend changes warrant it. New repository tests belong in existing suites. Adapt commands to the target package scripts rather than inventing a test runner.

## 5. Hand off without conflating stages

| Stage | Meaning / authorization |
| --- | --- |
| Generated and tested | Files exist and stated checks pass; no site change implied |
| Installed | Copy to authorized `plugins/<id>/` (or configured pluginsPath), or add the package as a direct dependency/optionalDependency; devDependencies are not discovered |
| Enabled | New/unsaved plugin state defaults disabled. Enable under plugin management and verify active behavior; clustered workers reload, single-process sites need restart |
| Published | Separate npm/release operation; inspect `npm pack`, account/namespace, license and version, then require existing publication authorization |
| Market-listed | Separate official Registry submission/review and compatibility/integrity requirements; an npm package is not automatically in the marketplace |

Do not deploy, install dependencies into a live site, publish, submit to the market, merge or send external notifications without corresponding authorization. Carry forward permission already given; do not request it again. GitHub-managed market operations create a PR, not immediate site files: merging, deployment and enabling are separate. Use current `docs/plugins.md` and installer/Registry source to verify naming/allowlist constraints; do not promise acceptance.

Report concrete files, configuration, invocation and compatibility; list commands/results and remaining unverified behavior. Clearly label “generated”, “installed”, “enabled”, “published” and “listed”.

Example prompts: “生成一个可配置的站点公告插件，只生成和测试，不安装”; “Add a public recent-posts Widget that never exposes private posts”; “Build an admin-only cache refresh action”; “Notify my service when a comment is approved, with signature and retries.” For the last request inspect moderation versus public-comment payloads and test duplicates/failures before any real delivery.
