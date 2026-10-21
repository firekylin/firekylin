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
      async generate(request, {signal}) {
        return {text: await callProvider(request.model, request.messages, signal)};
      }
    });
  }
};
```

`ctx.ai.generate()` uses the selected provider and model unless the request explicitly names them. Provider
plugins may expose their own administrator form and persist secrets with `ctx.ai.credentials`. Credentials are
encrypted with AES-256-GCM, scoped to the owning plugin, omitted from public options and never returned by
password forms. Set `FIREKYLIN_AI_CREDENTIAL_KEY` to a stable secret in production; otherwise Firekylin uses
the site's JWT secret for compatibility. Rotating the active encryption key requires providers to save their
credentials again.

Provider handlers receive an abort signal and should pass it to outbound requests. The shared client rejects
unknown providers and models and applies a 60-second timeout.
