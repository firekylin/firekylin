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
      description: 'Example text generation provider',
      logo: 'https://example.com/logo.svg',
      models: [{id: 'example-small', label: 'Example Small', capabilities: ['text']}],
      configured: () => ctx.ai.credentials.has('apiKey'),
      admin: {formId: 'settings', testActionId: 'test-connection'},
      async generate(request, {signal}) {
        return {text: await callProvider(request.model, request.messages, signal)};
      }
    });
  }
};
```

`description` and `logo` are optional provider metadata returned by `ctx.ai.providers()` and the AI connections
API for future admin presentation. Logos must use HTTPS or a site-relative URL; neither field is rendered as HTML.

`ctx.ai.generate()` uses the selected provider and model unless the request explicitly names them. The
request's `capability` defaults to `text`. Feature plugins requesting image generation must pass
`capability: 'image'`; the client checks the chosen model's `capabilities` before calling the provider and
returns `AI_UNSUPPORTED_CAPABILITY` (HTTP 400) when the model does not support it. Capability metadata
does not by itself implement image generation: a provider must also handle that request and response format.
The model picker can use the same metadata to filter incompatible models in future feature-specific UI.
administrator's **系统设置 → AI 连接** page lists installed providers and their optional `configured` status. Users select
a provider there, fill its plugin-supplied form and test the connection without leaving the page. The provider's
`admin` metadata names a plugin-scoped form and test action registered through `ctx.admin`; providers do not
need their own panel or page. **AI 连接** is also the only place users select the
global default provider and model. Saving connection settings should not call `ctx.ai.select()`.
Clearing the provider choice and saving removes the global default, so feature plugins that rely on the
default cannot generate until a provider is selected again. Explicit provider/model requests, such as a
connection test, remain available.
Connection tests should explicitly pass both provider and model so they work even when
another provider is the default. Provider plugins persist secrets with `ctx.ai.credentials`. Credentials are
encrypted with AES-256-GCM, scoped to the owning plugin, persisted in separate option rows so concurrent
plugins cannot overwrite each other's credentials, omitted from public options and never returned by
password forms. Set `FIREKYLIN_AI_CREDENTIAL_KEY` to a stable secret in production; otherwise Firekylin uses
the site's JWT secret for compatibility. Rotating the active encryption key requires providers to save their
credentials again.

The provider picker includes **添加更多 AI 服务商**, which opens an npm search for packages with the
`firekylin-plugin-ai-provider` prefix. Installing a package still requires the normal plugin installation
workflow; the search link does not install third-party code automatically.

Provider handlers receive an abort signal and should pass it to outbound requests. The shared client rejects
unknown providers and models and applies a 60-second timeout.
