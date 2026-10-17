# Firekylin AI Runtime v1 (experimental)

Firekylin keeps traditional blogging fully functional without AI configuration. AI writing previews are opt-in and never save articles automatically.

## Configure

Add the `ai` property to the blog project's existing `firekylin.config.js`:

```js
module.exports = {
  // Keep existing site and database config
  ai: {
    provider: 'openai-compatible',
    model: 'gpt-4.1-mini',
    baseUrl: 'https://api.openai.com/v1'
  }
};
```

Set `FIREKYLIN_AI_API_KEY` as a secret environment variable (do not commit it to Git).

To use Ollama (the provider speaks OpenAI-compatible Chat Completions), choose an installed local model:

```js
ai: {
  provider: 'ollama',
  model: 'qwen3:8b',
  baseUrl: 'http://127.0.0.1:11434/v1'
}
```

For hosted deployments, localhost refers to the server, not the reader's device. Do not expose Ollama publicly without authentication.

## Preview API

Authenticated admins/editors can call:

```http
POST /admin/api/ai
Content-Type: application/json

{
  "task": "post.summary",
  "markdown_content": "# Example\n\nA short article."
}
```

Tasks: `post.summary` produces a concise Chinese summary; `post.polish` rewrites Markdown while preserving technical content. Requests are limited to 40,000 characters; upstream network calls time out after 45 seconds. Existing backend authentication and same-site/referrer rules still apply.

The endpoint returns `{errno:0,data:{task,text,model}}` on success; callers must preview/diff and ask the author before saving. The first version is non-streaming and does not add a new standalone AI chat UI.

## Extension

Any installed trusted Firekylin plugin can register another provider:

```js
module.exports = {
  register(ctx) {
    ctx.ai.registerProvider('my-provider', {
      async generate({model, messages}) {
        return {text: 'model output'};
      }
    });
  }
};
```

The provider registration is cleaned up automatically when the plugin is disabled. Tool Registry and MCP are independent: a blog author can use built-in AI features without enabling external MCP access.

## Security and limits

- `baseUrl` is trusted project configuration; never accept this URL from a reader or generated tool argument (SSRF).
- `apiKey` is read only server-side, ideally from the environment.
- The model output is untrusted draft text. Never execute returned Markdown, scripts or code.
- Add per-user rate limits, token/cost budgets, advanced streaming, and editor controls before enabling for a high-traffic production site.
- AI provider errors should not leak raw API credentials or upstream response bodies.

Run `pnpm test:plugin`, `pnpm lint-break-on-errors`, and test admin permissions and editor save flow before merge.
