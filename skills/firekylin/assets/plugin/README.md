# __PLUGIN_ID__

A public site message, exposed as JSON and an escaped Eta template function.
CommonJS, no dependencies, no database writes, external requests, timers or private-content access.
Targets Firekylin __FIREKYLIN_VERSION__ exactly; expand the engine range only after testing other versions.
Choose a license before distributing this package.

## Configure and use

Merge `config.example.cjs` into the site's existing `firekylin.config.js`.
`pluginConfig['__PLUGIN_ID__'].message` defaults to `Welcome to this site` and must be a nonblank string of at most 200 characters.
Invalid configuration fails activation; check plugin status and server logs. Configuration changes require restart.
The message is public: never use it for secrets.

After installation and enabling:

```sh
curl --fail http://127.0.0.1:8360/api/plugins/__PLUGIN_ID__/message
```

Expected JSON with the default configuration:

```json
{"message":"Welcome to this site"}
```

Add this to a chosen active-theme template only if theme editing is authorized:

```eta
<% const siteMessage = firekylin.plugin['__PLUGIN_ID__']
  ? await firekylin.plugin['__PLUGIN_ID__'].message() : null; %>
<% if (siteMessage !== null) { %><aside><%= siteMessage %></aside><% } %>
```

Resolve `siteMessage` at template top level, before any synchronous `block(...)` callback; insert the aside in the desired block. Do not put `await` inside a synchronous block. The guard allows disabling/uninstalling the plugin. Use escaped `<%=` output, not raw HTML.
Template use is optional; the route works without editing any theme.

## Test before installing

Review the source first: tests execute trusted server code and are not a sandbox.
With a matching Firekylin source/package directory and its dependencies installed:

```sh
FIREKYLIN_CORE=/absolute/path/to/firekylin npm test
npm pack --dry-run --ignore-scripts
```

Tests verify real manager discovery, disabled/enabled state, route/template behavior, invalid configuration, compatibility errors and cleanup. They do not start a full site.
Separately use a disposable initialized site/database, request the actual route, render the chosen template, and test disabling/restarting. Record the host version and results.

## Install, enable and roll back

Generation does not install this plugin. With authorization, copy this directory to the site's `plugins/__PLUGIN_ID__/` (or configured pluginsPath); do not overwrite another plugin. Alternatively install a published package as a direct project dependency, not a devDependency. Restart to discover it.

New plugins default disabled. Enable it under **插件管理 → 已安装插件**; restart in single-process mode. Verify the JSON response. Workers in a clustered deployment reload when state changes. Do not claim activation merely because files exist.

Disable it before removing its files/dependency; restart and verify the route is gone. Remove its config entry and any optional theme snippet when appropriate. It creates no plugin-owned persistent data. Keep a copy of the previous plugin/config for rollback.

npm publication and official market inclusion are separate operations requiring authorization and compatibility review; this generated package is neither published nor listed.
