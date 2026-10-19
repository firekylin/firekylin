# Firekylin MCP OAuth 连接

Firekylin 自带 **OAuth 授权服务器**，MCP 客户端连接博客不需要人工创建 Token、不需要修改 `firekylin.config.js` 中的 `userId`。

## 登录与授权流程

1. 在支持远程 MCP 的客户端添加 `https://your-blog.example/mcp`。
2. 客户端从 `401 WWW-Authenticate` 读取 OAuth Protected Resource Metadata，再发现 Firekylin OAuth Authorization Server。
3. 客户端通过动态注册获取 `client_id`，并生成 OAuth PKCE (S256) 挑战。
4. 浏览器跳转至 Firekylin 的 `/oauth/authorize`。如果用户未登录，将前往已有的 `/admin/login` 登录，成功后回到授权页。
5. 用户查看客户端名称、账户和申请的权限，点击同意或拒绝。
6. Firekylin 签发一次性 Authorization Code，浏览器返回客户端回调地址。
7. 客户端通过 `/oauth/token` 交换 Access Token 和 Refresh Token，之后就能以当前用户身份调用 MCP Tools。

所有令牌均为随机生成，数据库只存 SHA-256 摘要，且具有过期时间。授权码同时绑定 Client ID、Redirect URI、PKCE Challenge 和 MCP Resource。用户身份来自已认证的 Firekylin JWT Cookie。

## 标准 OAuth 端点

| Endpoint | 用途 |
| --- | --- |
| `/mcp` | MCP Streamable HTTP |
| `/.well-known/oauth-protected-resource/mcp` | OAuth Resource Metadata |
| `/.well-known/oauth-authorization-server` | OAuth Authorization Server Metadata |
| `/oauth/register` | OAuth Dynamic Client Registration |
| `/oauth/authorize` | 登录与确认授权 |
| `/oauth/token` | 授权码换 Token、Refresh Token 轮换 |
| `/oauth/revoke` | 撤销令牌 |

要求用户的博客 `site_url` 配置为准确的 HTTPS 根地址；本地调试可使用 localhost / 127.0.0.1 HTTP。

## 数据库

迁移会创建 `fk_mcp_oauth_client` 和 `fk_mcp_oauth_grant`，实际前缀由数据库配置决定。支持 SQLite、MySQL/TiDB 和 PostgreSQL。数据库记录关联真实 Firekylin 用户 ID，客户端无权随意提交用户 ID。用户被禁用后，已有访问令牌也会立即失效。

## 安全边界

- 无需预先配置客户端 ID、Secret 或用户 ID，授权必须经过真实站点登录和确认。
- OAuth 使用 Authorization Code + PKCE S256，不支持 Implicit / Password Grant。
- 授权页核验 JWT 登录、一次性持久化 CSRF Token、Scope、Redirect URI 和 PKCE Challenge。
- 动态注册仅支持 HTTPS 和 localhost/loopback 回调。公开注册接口应通过反向代理限制注册频率。
- MCP 执行会继续经过 Tool Registry 的 Scope 判断和共享业务 Service 的角色/资源权限判断。
- 发布、删除、审核和设置修改等高风险 Tool 除 OAuth Scope 与管理员权限外，还要求每次调用显式传入
  `confirm: true`。OAuth 授权页面不能替代这项逐次确认。
- 在反向代理层配置 TLS、限流、IP 防滥用与适当的请求体限制。
- Access Token 默认 1 小时有效，Refresh Token 默认 30 天，刷新时执行轮换。服务器重启不会丢失数据库里的授权记录。
- 修改密码、退出网页登录与撤销 OAuth 授权属于不同操作。管理员若需要立即撤销某客户端的所有授权，可使用后台撤销入口（尚待实现），或者禁用关联用户。单个令牌也可经 `/oauth/revoke` 撤销。

## 验证

```bash
pnpm install --lockfile-only
pnpm test:plugin
pnpm lint-break-on-errors
```

需要在部署环境用 MCP Inspector / Codex 验证：发现、动态注册、重定向登录、授权码交换、Token 刷新、工具调用、拒绝授权、一次性授权码不可重放、HTTPS 反向代理。

**注意：** 这是待审查的实现分支，仍需要端到端联调与安全审查，不要直接用于公网生产环境。

## 管理接口权限

管理员可以按需授权 `posts:publish`、`posts:delete`、`taxonomy:write`、`comments:write`、
`comments:moderate`、`settings:read` 和 `settings:write`。编辑者不能获得这些管理员 Scope。

远程 MCP 支持文章发布与永久删除，评论发布、编辑和审核，分类与标签的增删改，以及站点设置读取和修改。
删除、已有内容修改、审核和设置修改均属于高风险操作，需要在 Tool 参数中额外携带 `confirm: true`。
站点设置仅开放常规展示、阅读、分析和评论配置白名单，不允许通过 MCP 修改 JWT 密钥、上传服务凭据、
LDAP、双因素认证或推送目标等敏感配置。


## 旧版源码部署

使用 `node production.js` 或 `node development.js` 的旧版部署通过 ThinkJS `mcp` 配置读取 `enabled`、`allowedOrigins` 等选项，例如在 `src/config/mcp.js` 导出 `{enabled: false}` 可以关闭 MCP/OAuth。独立项目仍优先读取 `firekylin.config.js`。OAuth 使用已有 JWT 登录，不要求启用 session 扩展。
