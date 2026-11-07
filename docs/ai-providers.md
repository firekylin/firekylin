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
The administrator's **系统设置 → AI 连接** page displays configured providers as separate tabs. Use
**增加服务商** to configure another installed provider, or **安装更多 AI 服务商** to open the plugin search.
The add-provider button sits beside the standalone tabs and opens a provider menu.
Each tab contains provider settings, model/testing controls and a save button.
Each provider has one connection; configuring another provider retains existing connections. Saving a
connection alone does not change the global default. Select a model and click **设为默认模型**, then
save, to change the default explicitly. Editing the model on the current default tab updates that default
when saved. Test connections after saving configuration changes.

The × beside a provider tab appears on hover or keyboard focus (always visible on touch devices).
It opens a confirmation naming the provider before removal. Confirming **删除服务商** removes the connection's API key without uninstalling the plugin or deleting chat history.
If that provider was the global default, the default is cleared. Feature-specific bindings are retained
and become unavailable; they never silently fall back to another provider. Reconfigure the connection or
explicitly select a replacement in **智能内容**. For compatibility, core removes the standard plugin-scoped
`apiKey` credential for single-provider plugins implementing `configured()`. Non-secret endpoint settings
are retained. Providers with custom credential storage or multiple providers in one plugin should implement
`disconnect()` to remove their connection credentials and make `configured()` return false. Core exposes
removal only when a supported deletion path exists; it does not guess custom credential names.

The AI connection endpoint is a ThinkJS admin controller; provider form and test-action endpoints remain
plugin-scoped. The provider's `admin` metadata names a plugin-scoped form and test action registered through
`ctx.admin`. Saving a provider form should not call `ctx.ai.select()`.
Connection tests should explicitly pass both provider and model so they work even when
another provider is the default. Provider plugins persist secrets with `ctx.ai.credentials`. Credentials are
encrypted with AES-256-GCM, scoped to the owning plugin, persisted in separate option rows so concurrent
plugins cannot overwrite each other's credentials, omitted from public options and never returned by
password forms. Set `FIREKYLIN_AI_CREDENTIAL_KEY` to a stable secret in production; otherwise Firekylin uses
the site's JWT secret for compatibility. Rotating the active encryption key requires providers to save their
credentials again.

The provider picker includes **安装更多 AI 服务商**, which opens an npm search for packages with the
`firekylin-plugin-ai-provider` prefix. Installing a package still requires the normal plugin installation
workflow; the search link does not install third-party code automatically.

Provider handlers receive an abort signal and should pass it to outbound requests. The shared client rejects
unknown providers and models and applies a 60-second timeout.

## Article editor

The article editor provides title suggestions, summaries, article review and translation through
`/admin/api/ai-editor`. Each control is visible only when its effective model supports `text` and its
provider is not explicitly unconfigured. Per-feature selections work without a global default. The endpoint uses the shared AI client and requires an authenticated
administrator or author plus CSRF validation. It generates suggestions without saving the article.

Title and summary generation require more than 250 Unicode characters of body content; review requires
more than 100, and translation more than 10. Review changes are accepted, rejected or edited before replacing
the body. Translation optionally includes the title.

Summaries use the existing `summary` field directly. A non-empty submitted summary takes precedence; an
empty or omitted summary uses `getSummary` with the existing `<!--more-->` and excerpt-length behavior.
Bulk excerpt rebuilding preserves non-empty summaries. Password-protected articles hide summaries until
unlocked. No database migration is required.


### Optional content assistance

All ten feature switches are built into **系统设置 → 智能内容** (`/admin/options/smart-content`).
The core settings API `/admin/api/smart-content` requires administrator access and CSRF validation for writes.
Settings are stored in the existing `ai_content_features` option row; no AI Content plugin is needed.
Each capability uses a description/control row, with its model picker shown below the switch only when enabled.
On narrow screens these columns stack. Disabling a feature hides the picker but preserves its binding,
including an unchanged unavailable binding; enabling it again requires a valid model.
Each capability can select a provider/model independently. The picker lists only configured providers and
compatible models (image for image generation/editing, text for the other capabilities). Bindings are stored
in the `ai_content_models` option row, separately from switches and the global default. Title, summary,
review, translation, slug, classification (including tags), autocomplete, comment moderation and comment
reply each have a separate binding; cover generation and media image generation/editing share the image
binding. With no binding, text capabilities use the global default and images retain the existing automatic
selection of a configured image-capable model. Missing, removed or incompatible bindings must be explicitly
replaced; no content is sent to an alternative provider automatically. Explicit provider/model calls such
as chat conversations and connection tests keep their own selections.

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
Administrators can inspect **管理工具 → AI 调用日志**. Records are retained permanently unless an
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

Request and response text are always recorded for subsequent calls; there is no recording switch. Each direction keeps at
most 10,000 Unicode characters of message/output text, with truncation flags. Images, binary payloads,
request headers and complete network responses are not stored. Common API key/JWT/authorization/cookie
patterns are redacted before persistence. This does not guarantee detection of sensitive natural language.
Errors store a safe category and generic description rather than upstream error bodies.

The admin-only `/admin/api/ai-logs` endpoint supports paginated GET lists (without text) or GET `id`
details. Filters: `from` inclusive, `to` exclusive (ISO timestamps or UTC dates), `actor_id`, `scenario`,
`provider`, `model`, `status`. Summaries use the same filters and sum known counts independently.
CSRF-protected POST cleanup operations are
`{action: 'cleanup', scope: 'filtered', filters: {provider: 'example'}}` (all matching pages; an explicit
empty filter object selects every log), `{action: 'cleanup', ids: [positive IDs]}` (at most 100) or `{action: 'cleanup', before: ISO timestamp}`.
Core creates the prefixed audit table/indexes during installed-site startup for SQLite, MySQL, TiDB,
and PostgreSQL. Web installation also creates the audit schema before completion, without requiring a restart.

The log list includes non-commenter backend users as caller filter options and current provider metadata
for names, logos and model labels. Date ranges use local calendar days in the UI (inclusive end day).
The list shows total tokens and throughput, calculated as total tokens / elapsed seconds, to two decimals.
Zero/missing duration or missing usage yields unknown throughput rather than infinity.

Details group base metadata, model metadata, token usage, request text, response text and request context.
The JSON context captures the initiating request URL/method/source/query/body parameters and generation
arguments. No complete headers, credential fields, image parts or binary values are retained. Individual
strings are capped at 10,000 characters, with a 100,000-character string budget and bounded structure;
truncation is explicitly marked while preserving valid JSON. Older logs without context remain readable.


### Declarative usage adapters

Declare `usageAdapter` on the provider definition. Core supports `protocol: 'chat-completions'`
and `protocol: 'responses'` for standard field names. Override only differences in `fields`, keyed
by `AIUsageDetails` names. Selectors can be dotted paths, ordered fallback arrays, `{field, default}`
for optional counters, or `{sum: [...]}` for native counters that must be combined. Missing required
operands remain unknown; cached and reasoning details are not added to the total a second time.

```js
usageAdapter: {protocol: 'chat-completions', fields: {
  cacheReadTokens: ['prompt_cache_hit_tokens', 'prompt_tokens_details.cached_tokens']
}}
```

The generation context supplies `reportUsage(rawUsage, response)`. Call it with `undefined` usage
as soon as response headers arrive, then with native usage after parsing JSON and before checking
for empty output. Core extracts only normalized counters and the request ID synchronously, adds
`usageDetails` to successful results, and makes reported metadata available to auditing even if the
provider throws, times out or is cancelled later. Original provider errors remain unchanged. Reports
after completion or cancellation are ignored; full response objects and headers are never stored.
Existing providers without declarations keep their previous return values and legacy usage support.
No additional utility npm package is required.

### Shared image helpers

Core passes a frozen `images` helper object in the provider generation context, alongside
`signal` and `reportUsage`. Provider adapters should forward this object to their native
clients rather than bundle copies or import core implementation paths:

```js
generate: async(request, {signal, reportUsage, images}) => nativeClient({request, signal, reportUsage, images})
```

- `images.image(value)` validates and normalizes `{mimeType, data}` (PNG, JPEG or WebP;
  nonempty base64 up to 28,000,000 characters).
- `images.inputs(request, max = 1)` validates the reference image list and provider-specific limit.
- `images.uri(value)` creates a validated base64 data URI.
- `images.prompt(request)` joins message text into an image prompt and rejects empty prompts.
- `images.output(payload, mimeType)` converts native `data[].b64_json` results and rejects missing output.

The provider remains responsible for its native protocol, MIME type and model-specific limits.
These helpers do not upload files. Install a core release containing this API before updating
image provider plugins. Text-only calls do not require the helpers.

## Admin chat

The existing overview page (`/admin/dashboard`, or `/admin/dashboard/:sessionId`) embeds a private chat module
in place of the website summary for administrators. Non-administrators retain the original summary and quick links.
The administrator overview starts with a large chat composer and suggestions above the existing recent posts,
system information and about sections. History is collapsed by default and can be toggled with the triangle handle
on the divider. Sending the first message switches the entire main area into conversation mode, hides the overview
sections and upgrade notice, and opens history once. Users can then collapse history again without subsequent
replies reopening it. Opening an existing conversation also uses conversation mode; starting a new conversation
restores the overview. Non-administrators retain the original overview.
There is no separate chat page or navigation item; `/admin/overview` redirects to `/admin/dashboard`.

The chat view uses Ant Design X 2.10 (`Bubble`, `Conversations`, `Welcome`, `Prompts`, `Sender`,
`Suggestion`, `Think`, `ThoughtChain`, `Actions`, `Sources`) and X Markdown. The right history panel is
flush with the overview edges, with a single divider and an overlaid handle. Width, content opacity
and handle rotation animate together; reduced-motion preferences disable these transitions. Collapsed
history is inert and excluded from the accessibility tree.

ThoughtChain displays actual tool-call proposals, confirmations and execution results, not hidden model
reasoning. Proposals alone are never marked successful. Think shows public generation/execution status.
Sources link only to blog records returned by tools; no generated source list is invented. Markdown escapes
raw HTML, prevents remote image loads, and renders fenced code using the lazily loaded CodeHighlighter.
Completion notifications use X Notification only after the user opts in and grants browser permission;
they are emitted when the page is hidden and contain generic completion text, never conversation content.
 Conversations are owned by the current backend
user, persisted separately from AI audit logs, and cannot be read by other users. Deleting a conversation
does not delete blog content or existing AI audit records. Startup and web installation create the four
prefixed `chat_session`, `chat_message`, `chat_run`, and `chat_action` tables.

### Provider contract

Existing providers with `text` capability continue to support ordinary chat. To support blog operations,
models must also declare `tools`. The normalized generation request may include:

```js
{
  messages: [
    {role: 'user', content: 'Find my drafts'},
    {role: 'assistant', content: '', toolCalls: [
      {id: 'call-1', name: 'posts.list_managed', input: {status: 0}}
    ]},
    {role: 'tool', toolCallId: 'call-1', name: 'posts.list_managed', content: '{"data":[]}'}
  ],
  tools: [{name: 'posts.list_managed', description: 'List articles', inputSchema: {type: 'object'}}]
}
```

Return `{text, toolCalls?: [{id, name, input}], providerData?}`. Translate both tool definitions and
history messages to the provider's native protocol. `providerData` is optional opaque continuation
state (for example encrypted reasoning), persisted with assistant tool calls and sent back to the provider;
it is never rendered as reasoning in the chat. Keep tool call IDs stable and unique. Do not return
unparsed argument strings as `input`. Dotted ability names may require reversible vendor-specific encoding.

Providers implementing incremental text can call the optional `context.onText(delta)` callback, and should
advertise `stream` capability. They must still return complete final text and usage, reject incomplete streams,
and propagate `context.signal`. Core never converts plain model text into an executable tool call.
The companion OpenAI and DeepSeek plugin source packages include adapters for this protocol; installed
older plugin versions require updating before they expose the new capabilities.

The chat endpoint uses POST event streams for send/confirm/retry, with `run`, `status`, `delta`, `message`,
`action`, `audit`, `heartbeat`, `error`, and `done` events. Disconnecting cancels the run; the browser
reloads persisted messages and never resends writes automatically. A stale run lease is recovered after
150 seconds without heartbeat. An uncertain action remains visible for manual verification, without replay.

### Tool policy

Only abilities explicitly exposed to `admin-chat` are discoverable. Core management abilities use the same
business services and model lifecycle as the regular admin UI. Authors are limited to their existing article
permissions; comment, taxonomy mutation and settings tools require an administrator. The server loads the
bundled Firekylin skill as guidance, independently checks schemas and permissions, and treats blog text and
tool output as data. It does not grant shell or arbitrary filesystem access.

Read tools and private draft creation/editing run directly. Other mutations require a persisted preview and
confirmation, including publishing, permanent deletion, published article edits, comment changes and settings.
Confirmation expires after 15 minutes, checks the current role and object fingerprint again, and atomically
claims the stored operation. Clients submit only the action ID and decision, never replacement arguments.
Each conversation has one active run, at most eight model turns and a two-minute overall generation budget;
each individual AI call retains the shared client's timeout. A stop cannot undo a mutation already committed.


## Core-owned streaming

For text streaming, providers send their native streaming request and return the raw
HTTP response using `context.streamResponse(response, protocol)`. Core consumes the
response inside the same timeout, cancellation and audit scope as generation. It
invokes `onText(delta)` and returns the assembled text, usage and supported tool calls.
Providers must not read the body or invoke the callback themselves on this path.

```js
async generate(request, {signal, onText, streamResponse}) {
  if (onText && !streamResponse) throw new Error('Streaming requires updated Firekylin core');
  const response = await fetch(endpoint, {
    method: 'POST', signal, headers,
    body: JSON.stringify({...nativeRequest(request), stream: Boolean(onText)})
  });
  if (!response.ok) throw new Error(`Provider request failed (HTTP ${response.status})`);
  if (onText) return {...streamResponse(response, 'chat-completions'), provider: 'example', model: request.model};
  return normalize(await response.json());
}
```

Built-in protocols: `chat-completions` (the default when omitted), `responses`
(OpenAI SSE), and `ollama` (NDJSON). Chat Completions and Responses assemble
Firekylin tool calls; Responses preserves encrypted reasoning continuation.

For other protocols, return `streamResponse(response, parser)`. Anthropic and Gemini
ship their own event adapters in their plugin packages, including native usage and
legacy result normalization. Core knows nothing about those providers' event schemas.

```js
if (!streamResponse?.supportsCustomParser) throw new Error('Streaming requires updated Firekylin core');
// Create a new stateful adapter for every request. Only core reads the response body.
return streamResponse(response, {
  format: 'sse', // or 'ndjson'
  parse(data) {
    const event = JSON.parse(data);
    return {text: event.delta, usage: event.usage, done: event.finished};
  },
  end() { /* optional clean-EOF/explicit-stop validation; may return an event */ }
});
```

`parse` is synchronous and receives a decoded SSE data payload or NDJSON record.
It returns a normalized `AIStreamEvent` or nothing for ignored frames. Fields:

- `text`: text delta; core accumulates it and invokes `onText`.
- `usage`: native cumulative counters, reported through the provider's usage adapter
  immediately, even when the same event has an error. Never sum cumulative updates.
- `resultUsage`: optional legacy result shape, independent of native audit counters;
  otherwise the most recent `usage` becomes the result usage.
- `toolCalls`: complete normalized calls appended to the result; `providerData`:
  opaque continuation state replacing the previous state. Core bounds both.
- `done`: protocol completion observed. Continue reading until EOF, allowing later
  usage-only frames. `stop` also ends reading immediately and requires completion.
- `error`: a safe failure message. Return it with usage rather than throwing before
  core can report counters. Do not copy upstream error bodies.

`end` runs on clean EOF or explicit stop, never after transport/parse/callback errors.
It may validate deferred finish reasons or return final counters. EOF without `done`
is truncation. Core owns UTF-8/CRLF decoding, frame/text/tool/state limits, callbacks,
reader cleanup, cancellation and timeout for default and custom parsers alike.
The response, parser and headers never become part of the public generation result.

Existing ordinary-result and callback providers continue to work. Feature-detect
`streamResponse` (built-ins) or `streamResponse.supportsCustomParser` (custom adapters)
before a streaming network request; older cores receive an explicit upgrade error.
Non-streaming and image paths are unchanged.

### Release order

First merge and **publish a new core version** containing this API, then verify its
published package/release, then merge the provider PR. Core npm/release workflows
require a package version change; merging this implementation alone does not publish
it. The provider PR already bumps minor versions, and merging it to `main` triggers
automatic npm publication. Runtime feature detection avoids claiming support for
an unreleased core version. This change does not publish or merge either repository.

### Image understanding (vision)

`vision` is an additional capability of a text model; `image` remains image generation/editing. A vision adapter must preserve every user message's `images?: Array<{mimeType, data}>` and translate those base64 inputs to its native image blocks. Do not flatten images into text, fetch arbitrary URLs, or advertise vision for an unverified custom model ID.

Core validates static PNG/JPEG/WebP inputs, fully decodes/re-encodes them using sharp, strips metadata, enforces 2 MiB/4096 px per image and 12 images/8 MiB per request, and rejects image inputs on models without `vision`. `context.vision.inputs(message)` returns the checked `{mimeType, data}` pairs for conversion; new adapters should fail before network I/O if image messages are present but this helper is absent on an old core. Only user messages may carry images. Legacy string `content` remains unchanged, including tool-call state and streaming.

Image input calls automatically suppress audit request/response content and HTTP body copies while retaining usage and status metadata. See [chat attachment limits and privacy](chat-attachments.md) for the UI/storage contract.
