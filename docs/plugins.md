# Firekylin plugins

Firekylin plugins are trusted server-side Node.js modules. A plugin lives in the
project's `plugins/<id>/` directory and contains a `manifest.json` plus the
entry module declared by `entry`.

```text
plugins/
  example/
    manifest.json
    plugin.js
```

```json
{
  "id": "example",
  "name": "Example plugin",
  "version": "1.0.0",
  "engine": ">=2.5.5",
  "entry": "plugin.js",
  "permissions": []
}
```

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
