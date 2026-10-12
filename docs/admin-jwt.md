# Stateless administrator authentication

Firekylin signs the administrator's login identity into an HS256 JSON Web Token.
The token is stored in the `fk_admin_token` HttpOnly, SameSite=Lax cookie.
There is no per-login file session or shared in-memory session store. Workers
and Serverless instances can verify the same token independently.

## Shared signing secret

Firekylin stores the JWT signing key in `fk_options.jwt_secret` (or the
configured options table prefix). The existing comment schema migration creates
a new random 32-byte secret for fresh installations. For upgrades, it **copies**
the existing `comment_jwt_secret` into `jwt_secret` so previously issued
comment login tokens keep working. No environment variable is required.

Each worker loads this secret once during the startup migration hook and keeps
it in memory for synchronous token verification. Requests do not query the
database for the key or for a session. Restart all workers after deliberately
rotating the database secret; all existing administrator and comment tokens will
then be invalidated.

The old `comment_jwt_secret` row is retained only for backward compatibility
with prior versions of Firekylin. Neither signing key is returned by public
options or admin system settings.

Existing File Session cookies do not migrate to JWT. Users must log in once
after deploying the change. The administrator's JWT expires after seven days.
When "remember me" is selected, the cookie is persistent for seven days;
otherwise it is a browser-session cookie with the same server-side JWT expiry.

Logout clears the browser cookie but does not revoke copies of the JWT already
issued. Password changes, account disablement and role changes likewise do not
revoke outstanding JWTs until expiry. Rotate the secret to invalidate all tokens.
Future OAuth/MCP tokens must use their own audience and scopes; administrator
cookies are not MCP access tokens.

## CSRF and cookies

Cookie authentication still requires protection against cross-site requests.
Built-in admin API mutations retain their existing Referrer checks. Plugin
mutations with `csrf: true` require the `X-CSRF-Token` header. The administrator
page exposes a deterministic token in `window.SysConfig.csrfToken`, tied to the
current signed login cookie. Example:

```js
fetch('/api/plugins/example/refresh/42', {
  method: 'POST',
  credentials: 'same-origin',
  headers: {'X-CSRF-Token': window.SysConfig.csrfToken}
});
```

Use `csrf: false` only for routes with appropriate alternative protection
(for example, a properly signed webhook). Deploy admin over HTTPS and configure
trusted reverse proxies so the application can recognize HTTPS requests.
