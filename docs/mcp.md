# Firekylin 内置 MCP Server

从支持该功能的 Firekylin 版本开始，MCP 是核心程序自带的协议服务，**无需安装插件**。默认端点：

```
https://your-blog.example/mcp
```

MCP 与后台 API 复用 Tool Registry 和内容业务 Service，不会在服务器内部再对自己的 Admin API 发 HTTP 请求。

## 启用和认证

升级后的站点不需要另外安装包。未配置合法 Bearer Token 时，`/mcp` 会响应 **401**，不会暴露文章管理接口。若明确不希望此路由存在，可在 `firekylin.config.js` 中设置 `mcp.enabled = false`，此时返回 404。

先为每个 MCP 客户端分别生成安全随机令牌：

```bash
TOKEN=$(openssl rand -hex 32)
printf '%s' "$TOKEN" | shasum -a 256
```

将 SHA-256 摘要添加到现有 `firekylin.config.js` 的 `mcp` 配置（不要覆盖原有 `database` 配置）：

```js
module.exports = {
  // 原有数据库、站点等配置保持不变
  mcp: {
    enabled: true,
    requireHttps: true,
    allowedOrigins: ['https://your-blog.example'],
    tokens: [{
      sha256: 'REPLACE_WITH_64_CHARACTER_SHA256_DIGEST',
      userId: 1, // 已存在的、启用状态的 Firekylin 用户
      scopes: [
        'posts:read',
        'posts:manage:read',
        'posts:write',
        'taxonomy:read'
      ]
    }]
  }
};
```

客户端使用原始 Token 发送 `Authorization: Bearer TOKEN`，服务端每次调用都会重新查询用户状态，使用真实用户角色进行业务权限校验。不要在仓库、终端日志或者前端 JS 中暴露原始 Token。

## MCP 客户端配置

客户端类型选择 **Streamable HTTP**，地址为 `https://your-blog.example/mcp`，HTTP Header 配置为：

```
Authorization: Bearer <raw token>
```

各客户端（Codex、Claude Code、MCP Inspector）配置语法可能不同。建议首先用 MCP Inspector 依次调用 `initialize`、`tools/list` 和 `tools/call`，确认协议握手、发现及权限生效。

## 安全约束

- `mcp.requireHttps` 默认启用；反向代理应正确配置 HTTPS 和可信代理头。
- 非浏览器客户端通常不发送 Origin；有 Origin 的请求必须匹配 `mcp.allowedOrigins`。
- Access Token 按用户和 scopes 授权，按需分别签发并轮换；撤销可直接从配置移除相应摘要并重启。
- 需要显式审批的 `posts.publish`、`posts.delete`、`posts.update`、`comments.approve` **暂不从 MCP 暴露**，即使授权了对应 scopes 也无法绕过审批。
- 参数使用 MCP SDK 的 JSON Schema 验证。接口具备基本请求体大小限制，生产环境仍应在反向代理实施限流和请求超时。
- 审计日志不会记录原始 Token 或工具参数，但生产级持久化审计与 Token 管理后台仍需要后续完善。
- 没有配置 Token 时，MCP 是内置但不可访问的；不要把“内置”理解为允许匿名操作。

## 验证

```bash
pnpm test:plugin
pnpm lint-break-on-errors
```

生产部署前应验证 ThinkJS 中间件流式处理、实际 MCP 客户端及反向代理行为。目前代码尚待完整端到端测试，不应直接视为生产已验证版本。


## 旧版源码部署

使用 `node production.js` 或 `node development.js` 的旧版部署，可通过 ThinkJS 的 `mcp` 配置设置相同选项，例如在 `src/config/mcp.js` 中导出上述 `mcp` 对象。独立项目仍优先使用 `firekylin.config.js`，无需切换部署结构。
