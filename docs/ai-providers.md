# AI providers

Firekylin exposes AI as an internal application service. Provider plugins register models and a generation
handler; feature plugins call the shared client without depending on a vendor SDK. These APIs are separate
from the MCP Ability Registry: MCP remains the external agent integration, while AI providers serve trusted
backend features.

```js
module.exports = {
  register(ctx) {
    ctx.ai.registerProvider({
      id: 'example',
      label: 'Example AI',
      models: [{id: 'example-small', label: 'Example Small', capabilities: ['text']}],
      configured: () => ctx.ai.credentials.has('apiKey'),
      async generate(request, {signal}) {
        return {text: await callProvider(request.model, request.messages, signal)};
      }
    });
  }
};
```

`ctx.ai.generate()` uses the selected provider and model unless the request explicitly names them. The
administrator's **AI 服务** page lists installed providers, their optional `configured` status, and links to
provider settings. It is the only place users select the global default provider and model. Provider plugins
may expose their own administrator form for API keys and endpoints; saving connection settings should not
call `ctx.ai.select()`. Connection tests should explicitly pass both provider and model so they work even when
another provider is the default. Provider plugins persist secrets with `ctx.ai.credentials`. Credentials are
encrypted with AES-256-GCM, scoped to the owning plugin, persisted in separate option rows so concurrent
plugins cannot overwrite each other's credentials, omitted from public options and never returned by
password forms. Set `FIREKYLIN_AI_CREDENTIAL_KEY` to a stable secret in production; otherwise Firekylin uses
the site's JWT secret for compatibility. Rotating the active encryption key requires providers to save their
credentials again.

Provider handlers receive an abort signal and should pass it to outbound requests. The shared client rejects
unknown providers and models and applies a 60-second timeout.
