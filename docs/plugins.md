# Firekylin plugins

Firekylin plugins are trusted server-side Node.js modules. A plugin lives in the
project's `plugins/<id>/` directory and contains a `manifest.json` plus the
entry module declared by `entry`.

```text
plugins/
  example/
    package.json
    plugin.js
```

```json
{
  "name": "Example plugin",
  "version": "1.0.0",
  "main": "plugin.js",
  "engines": { "firekylin": ">=2.5.5" },
  "firekylin": {
    "type": "plugin",
    "id": "example",
    "permissions": []
  }
}
```

Plugin metadata is read from `package.json`. `firekylin.id` is the stable
runtime identifier; `firekylin.entry` overrides `main` when needed. The
Firekylin engine constraint can be declared as `firekylin.engine` or
`engines.firekylin`.

The entry module must export `register(ctx)`. `activate(ctx)` and
`deactivate(ctx)` are optional lifecycle hooks.

```js
module.exports = {
  register(ctx) {
    ctx.events.on('content.created', async content => {
      ctx.logger.info(`created: ${content.id}`);
    });
  },
  async activate(ctx) {},
  async deactivate(ctx) {}
};
```

Listeners are asynchronous and run by ascending priority. A plugin can only
remove its own listeners. Plugin loading errors are logged and isolated so a
broken plugin does not prevent the application from starting.

The current runtime is intentionally a trusted-plugin model: plugins execute
in the application process. Do not install untrusted code. Future work can add
the Widget, Eta template, route, admin and permission APIs on top of the same
`PluginManager` and `EventBus`.

Currently emitted application events include:

- `app.ready` after enabled plugins have loaded;
- `content.created` and `content.updated` after posts or pages change;
- `content.render` as a filter for rendered content and summaries;
- `theme.beforeRender` and `theme.afterRender` around theme output.

Firekylin does not provide a built-in comment persistence layer. Comments are
currently delegated to configured third-party services, so comment lifecycle
events will be added when Firekylin owns a comment submission pipeline.
