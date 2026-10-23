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
a provider there, fill its plugin-supplied form and test the connection without leaving the page. The AI connection
endpoint is a ThinkJS admin controller; provider form and test-action endpoints remain plugin-scoped. The provider's
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

## Article editor

The article editor provides title suggestions, summaries, article review and translation through
`/admin/api/ai-editor`. These controls are visible only when the selected model supports `text` and its
provider is not explicitly unconfigured. The endpoint uses the shared AI client and requires an authenticated
administrator or author plus CSRF validation. It generates suggestions without saving the article.

Title and summary generation require more than 250 Unicode characters of body content; review requires
more than 100, and translation more than 10. Review changes are accepted, rejected or edited before replacing
the body. Translation optionally includes the title.

Summaries use the existing `summary` field directly. A non-empty submitted summary takes precedence; an
empty or omitted summary uses `getSummary` with the existing `<!--more-->` and excerpt-length behavior.
Bulk excerpt rebuilding preserves non-empty summaries. Password-protected articles hide summaries until
unlocked. No database migration is required.


### Optional content assistance

All seven feature switches are built into **系统设置 → 智能内容** (`/admin/options/smart-content`).
The core settings API `/admin/api/smart-content` requires administrator access and CSRF validation for writes.
Settings are stored in the existing `ai_content_features` option row; no AI Content plugin is needed.
Slug generation, classification and autocomplete are opt-in. All switches are checked on every generation request.

If the core option is absent, existing encrypted `ai-content/settings` credentials are imported automatically,
even when the old plugin is inactive or removed. The import only inserts a missing row, so concurrent saves
and existing core settings take precedence. Legacy credentials are retained. The old plugin page URL redirects
to the built-in page, and obsolete AI Content sidebar panels are hidden.

Slug generation requires more than 250 characters and opens an editable suggestion dialog. The server
normalizes the result and checks uniqueness both when generating and when using the suggestion; the normal
save-time pathname collision validation remains authoritative. Category and tag selection use existing
choices only, require more than 250 characters and fill the unsaved editor state.

Autocomplete waits 1.2 seconds after input pauses, requests short continuations near the cursor, and renders
them in lighter text without a background. Three dots breathe in sequence beside the cursor while a request
is running and disappear immediately when input interrupts it or the request finishes. Tab accepts a suggestion; typing, selection changes, Escape and blur dismiss it.
Input-method composition pauses requests. Requests are cancelled on edits, navigation and disabling the
feature, and late responses cannot replace a newer suggestion. Suggestions are never saved automatically.

## Call audit logs

All calls through the shared client are recorded by core, including connection tests and plugin calls.
Administrators can inspect **系统设置 → AI 调用日志**. Records are retained permanently unless an
administrator manually deletes selected records or records before a date. No cost estimates are made.
Each generation gets a request ID; calls in one operation share a correlation ID. Authentication comes
from server-side async request context, never `request.user`, `actor`, or another submitted identity.
Outside requests, calls are attributed to system tasks. Unauthenticated HTTP calls are marked unknown.
Plugin wrappers add their owning plugin ID. Plugins can supply a descriptive server-side scenario:

```js
const result = await ctx.ai.generate({messages: [{role: 'user', content: article}]}, {
  scenario: 'article.outline', signal
});
```

Provider results retain native `usage` and may add `usageDetails` (see `Firekylin.AIUsageDetails`) with
`inputTokens`, `outputTokens`, `totalTokens`, `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens`.
Use `null` for unavailable counts; zero means a known zero. Input/output counts include their applicable
cache/reasoning components, so detail fields must not be added again. Total can be derived only when
both input and output are known. Providers may add `providerRequestId` to results or thrown errors;
never attach a whole response for auditing. Unrecognized/older usage fields remain unknown.

Calls start as unfinished and are finalized on success, failure, timeout or cancellation. A process exit
can leave unfinished records. Audit write failures produce a generic diagnostic and do not replace the
AI result or original exception. When a provider ignores cancellation, core stops waiting; it cannot
guarantee the remote provider stops processing or billing.

Text recording is off by default. Enabling it affects only subsequent calls. Each direction keeps at
most 10,000 Unicode characters of message/output text, with truncation flags. Images, binary payloads,
request headers and complete network responses are not stored. Common API key/JWT/authorization/cookie
patterns are redacted before persistence. This does not guarantee detection of sensitive natural language.
Errors store a safe category and generic description rather than upstream error bodies.

The admin-only `/admin/api/ai-logs` endpoint supports paginated GET lists (without text) or GET `id`
details. Filters: `from` inclusive, `to` exclusive (ISO timestamps or UTC dates), `actor_id`, `scenario`,
`provider`, `model`, `status`. Summaries use the same filters and sum known counts independently.
CSRF-protected POST operations are `{action: 'settings', recordContent: boolean}` and
`{action: 'cleanup', scope: 'filtered', filters: {provider: 'example'}}` (all matching pages; an explicit
empty filter object selects every log), `{action: 'cleanup', ids: [positive IDs]}` (at most 100) or `{action: 'cleanup', before: ISO timestamp}`.
Core creates the prefixed audit table/indexes during installed-site startup for SQLite, MySQL, TiDB,
and PostgreSQL. New installations follow the existing startup migration lifecycle.
