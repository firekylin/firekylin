# MCP、OAuth 与内置工具参考

先发现运行中客户端的 tools/list，使用实际工具名和 inputSchema。本文件说明基线实现；[tools.json](tools.json) 是源码 Registry 的 15 个工具声明快照，包含远程隐藏工具，不能当作部署站点的工具清单。

## 连接与认证

使用支持远程 MCP/OAuth 的客户端连接 `https://你的站点/mcp`。让客户端完成协议初始化和工具发现，不用自制普通 REST 请求代替 MCP 会话。服务使用官方 SDK 的 HTTP handler，支持 JSON/SSE；初始化、版本协商和响应封装由客户端处理。

| 路径 | 用途 |
| --- | --- |
| `/mcp` | 受 OAuth token 保护的 MCP 传输；POST/GET/DELETE |
| `/.well-known/oauth-protected-resource`、`/.well-known/oauth-protected-resource/mcp` | 资源元数据与授权服务器发现 |
| `/.well-known/oauth-authorization-server` | 授权服务器元数据 |
| `/oauth/register` | 动态客户端注册 |
| `/oauth/authorize` | 浏览器 JWT 登录、用户同意、绑定请求的 PKCE 授权码 |
| `/oauth/token` | code exchange 与 refresh token 轮换 |
| `/oauth/revoke` | 撤销给定 token |

当前允许有效管理员/编辑（用户 type 1/2），不支持匿名或评论者直接授权。`site_url` 是规范 origin，生产 HTTPS；loopback 开发地址的 HTTP 例外以实现校验为准。后台 Cookie 不可用作 MCP bearer token。

授权请求需要 state、resource、client_id、redirect_uri、scope 和 PKCE S256。客户端应完整验证 state 和服务端元数据。当前 code/consent 有效期 600 秒，access token 1 小时，refresh token 30 天；refresh 单次使用并轮换，不保证同时撤销旧 access token。动态注册仅接受实现允许的 HTTPS/loopback 回调，最多 5 个 URI；注册速率限制是进程内按 IP 的机制，不能解读为分布式全局限流。

固定 scope 为：`posts:read`、`posts:manage:read`、`posts:write`、`posts:publish`、`posts:delete`、`taxonomy:read`、`comments:read`、`comments:moderate`、`media:write`。插件自定义 scope 不会自动加入 OAuth allowlist。编辑不能获取发布/删除文章、读取/审核评论等管理员 scope；工具还会检查对象归属和实时角色。

## 内置工具一览

下表的“可发现”仍取决于 scope、角色和启用状态。**隐藏**表示当前远程 MCP 始终排除 requiresApproval 工具；这些声明只供内部实现/开发参考，不构造客户端调用绕过它。

| 工具 | scope | 远程 | 参数与返回 |
| --- | --- | --- | --- |
| `posts.list` | posts:read | 可发现 | page=1（1..10000），limit=10（1..50）；公开文章摘要列表 |
| `posts.get` | posts:read | 可发现 | id 正整数；公开文章摘要与 markdown，未找到返回 null |
| `posts.search` | posts:read | 可发现 | query 非空 1..120 字符，limit=10（1..50）；公开文章搜索列表 |
| `posts.list_managed` | posts:manage:read | 可发现 | page=1，limit=15（1..100），可选 status 0..4、keyword ≤120；返回 `{count,data}`，默认不含回收站 |
| `posts.get_managed` | posts:manage:read | 可发现 | id；含 markdown、status、is_public；未找到报错，非管理员限本人文章 |
| `posts.create_draft` | posts:write | 可发现 | title、pathname、markdown_content 必填；创建当前用户私密草稿，返回数值 ID |
| `posts.update_draft` | posts:write | 可发现 | id，加 title/pathname/markdown_content 至少一项；仅草稿和归属允许的对象，返回 `{id,affectedRows}` |
| `posts.update` | posts:write | **隐藏** | id 加至少一项内容字段；普通更新，编辑修改已发布内容可能转审核 |
| `posts.publish` | posts:publish | **隐藏** | id；管理员发布为 status=3，不自动改变 is_public 或发布时间 |
| `posts.delete` | posts:delete | **隐藏** | id；永久删除，区别于后台回收站 |
| `categories.list` | taxonomy:read | 可发现 | 空对象；`id,name,pathname,pid` 列表 |
| `tags.list` | taxonomy:read | 可发现 | 空对象；`id,name,pathname` 列表 |
| `comments.list` | comments:read | 可发现 | 管理员；page=1，limit=20（1..100），status 可为 approved/waiting/spam；列表不含邮箱 |
| `comments.approve` | comments:moderate | **隐藏** | 管理员；id，将 waiting 评论批准 |
| `media.upload` | media:write | 可发现 | name、format、base64；返回上传器的 URL |

精确 required、additionalProperties、类型、上下界和说明读取 [tools.json](tools.json)；服务端还执行运行时校验，不应仅依赖 JSON Schema。ID 必须为安全的正整数；文章 title/pathname 最长 255 字符，markdown_content 非空且运行时限 100 万字符。不要向草稿工具传入 category、status、userid 等未声明字段。

公开文章满足 `type=0`、`status=3`、`is_public=1`、时间不在未来。管理读取允许草稿等状态，但不会因此获得其他作者权限。公开 list/search 不提供管理列表的 count 包装，不假设它们有相同分页结构。

## 使用流程与调用参数

下面是客户端工具调用的 **arguments**，不是可直接 POST 到 `/mcp` 的协议报文。实际工具名可能被客户端加前缀。

阅读公开内容：先 list/search，再用返回的 id 调 get 获取正文。

```json
{"query":"部署","limit":10}
```

处理自己的草稿：先 list_managed 查找已有 pathname，再 get_managed 核对状态与作者权限；创建后用返回 ID 再读确认。

```json
{"title":"部署笔记","pathname":"deployment-notes","markdown_content":"# 部署笔记\n\n待整理的内容。"}
```

```json
{"id":123,"markdown_content":"# 部署笔记\n\n已核对的内容。"}
```

上例分别适用于 create_draft 和 update_draft；123 是示意 ID，应使用真实返回值。重复 pathname、无权对象或非草稿会失败，不自动覆盖、换随机 pathname 或改用隐藏工具。没有管理读取 scope 时，说明验证限制；公开 get 读不到私密草稿不代表保存失败。

上传图片：name 是 1..100 字符的字母、数字、下划线或连字符，不带扩展名；format 只允许 png/jpeg/gif。base64 是原始编码，不是 data URL；服务校验文件签名，解码后最大 5 MiB、编码输入最大 7 MiB。不接受远程 URL。上传后检查可读取 URL，再写入 Markdown；其他格式需要后台已有能力，不能编造 media.fetch。

MCP 结果使用 SDK `content` 文本包装，文本通常是 JSON 序列化的业务值。检查 `isError`，解析返回值后再决定下一步。错误消息可能被泛化，不能把空列表、null、协议错误、业务错误混为一类。后台管理 API 的 `errno` 约定也不能直接套用到 MCP wire 格式。

## 常见故障与限制

- 401：token 失效/撤销、用户禁用或认证失败；按客户端流程刷新或重新授权，不改用后台 Cookie。
- 403：检查 scope、实时角色、Origin/HTTPS；增加权限需要用户正常授权，不能直接修改 token 数据库。
- 404：检查部署版本、mcp.enabled、代理路径；不是所有 2.8.0 包都具有本技能能力。
- POST 415/413：检查 JSON Content-Type 与请求大小（当前传输上限 8 MiB）；media.upload 另有更小限制。
- OAuth 400：核对 redirect_uri、resource、PKCE、state 和 code 绑定；不要忽略校验来接通。
- 缺少 publish/delete/approve：当前隐藏策略所致；用已授权后台流程或交付可审阅稿件，不声称已经发布。
- 插件工具缺失：核对插件加载、命名、scope 和审批标志；工具 ID 应小写且不能冒充 `core:*` 所有者。

不要宣称 MCP 已覆盖页面创建、分类/标签写入、站点设置、用户管理、备份或任意导入；这些能力需要对应后台、文件或维护流程。

## 同步声明快照

在可信 Firekylin 源码根目录执行：

```sh
node skills/firekylin/scripts/export-tools.cjs > skills/firekylin/references/tools.json
```

复制到其他目录后，显式指定可信源码根路径：

```sh
node /path/to/skill/scripts/export-tools.cjs /path/to/firekylin > /path/to/skill/references/tools.json
```

脚本加载源码注册函数，只导出 metadata，不连接数据库、不调用上传器、不执行工具。它不会发现部署插件，也不会反映客户端当前用户/scope 的过滤结果。同步 JSON 后还需人工复核运行时限制、OAuth 策略和角色指南。
