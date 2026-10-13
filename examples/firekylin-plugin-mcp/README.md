# Firekylin MCP Server (experimental)

This package is an installable Firekylin plugin that exposes the existing Tool Registry over the official **MCP SDK v2** stateless HTTP transport. It is deliberately separate from the Firekylin core and reuses Admin/Tool shared services.

## Install

Run from your **blog project directory**, not from the Firekylin source repository:

```sh
npm install /path/to/firekylin/examples/firekylin-plugin-mcp
```

For package development inside the source checkout, replace the absolute path above with the path to your plugin folder. Firekylin discovers the package via `firekylin.type = "plugin"`.

## Credentials

Create a random token locally:

```sh
TOKEN=$(openssl rand -hex 32)
printf '%s' "$TOKEN" | shasum -a 256
```

Copy the digest to the project configuration and store the raw token in your MCP client. Never commit the raw token to git.

```js
// firekylin.config.js (add to your existing config)
module.exports = {
  database: {/* your existing database */},
  pluginConfig: {
    mcp: {
      // Required by default; the proxy must properly forward HTTPS.
      requireHttps: true,
      allowedOrigins: ['https://blog.example.com'],
      tokens: [{
        sha256: 'YOUR_64_HEX_SHA256_DIGEST',
        userId: 1, // Existing enabled Firekylin user, looked up on every request.
        scopes: ['posts:read', 'taxonomy:read',
          'posts:manage:read', 'posts:write']
      }]
    }
  }
};
```

The endpoint URL is `https://blog.example.com/api/plugins/mcp/mcp` (plugin-prefixed route). Configure any compatible MCP client with this HTTP URL and its `Authorization: Bearer <raw token>` header. For example, an MCP client that supports JSON-based remote servers may use:

```json
{
  "mcpServers": {
    "firekylin": {
      "url": "https://blog.example.com/api/plugins/mcp/mcp",
      "headers": {"Authorization": "Bearer YOUR_RAW_TOKEN"}
    }
  }
}
```

The client configuration format differs across Codex/Claude Code/other clients; use each client's current Streamable HTTP configuration syntax.

## Security constraints

- The endpoint is **disabled unless a valid token is configured**. Tokens are stored as SHA-256 digests in configuration; requests verify both token and corresponding live enabled user.
- Scopes are allowlisted per token, and the existing article services still enforce ownership and roles.
- `posts.publish`, `posts.delete`, `posts.update` and `comments.approve` are marked `requiresApproval` and are **not advertised or callable** through this first adapter. Granting their scopes does not bypass approval.
- All tool arguments are validated against their declared JSON Schema by the official MCP SDK, prior to invoking business code. Existing tools also validate many inputs themselves.
- The server rejects unsolicited browser Origins unless included in `allowedOrigins` (non-browser agents typically omit Origin).
- HTTPS is required by default; run the blog behind TLS with appropriately configured reverse-proxy headers.
- Default maximum POST request body: 8 MiB. Put the endpoint behind a reverse proxy with a suitable request limit and rate limiter.
- Never hand out a general admin token for a public chatbot. Use separately scoped, revocable credentials for each client.
- MCP calls use a short security audit record (name, user ID, success/failure, duration), without printing raw tokens or tool inputs.
- Access tokens in this initial release are configured manually. Token creation/revocation UI, OAuth discovery, durable auditing and interactive confirmation will require follow-up PRs.

## Verification

```sh
pnpm test:plugin
pnpm lint-break-on-errors
```

The MCP adapter depends on `@modelcontextprotocol/server@^2.3.1` as its own plugin dependency, not a mandatory Firekylin core dependency. Exercise the installed HTTP endpoint with MCP Inspector or a compatible MCP client after deployment.
