# 系统维护者指南

先读 [SKILL 入口](../SKILL.md)。此角色负责安装、运行、备份、认证、数据库与发布；账户管理操作仍受实际管理员权限限制。

## 识别运行方式

| 方式 | 配置与数据 | 操作入口 |
| --- | --- | --- |
| CLI 创建的独立项目 | `firekylin.config.js`、`themes/`、`plugins/`、`data/`、上传目录 | 项目内 `npm start` / `npm run dev`；核心在 `node_modules/firekylin` |
| 核心源码 / 旧安装 | `src/config/`、`www/`、运行时目录；可能有 `FK_DB_*` 环境覆盖 | `pnpm start` 启动后端，`pnpm dev` 启动 Vite 管理界面 |
| 当前 Dockerfile | 应用 `/opt/firekylin`，持久化根目录 `/var/lib/firekylin`，容器端口 8360 | 检查卷挂载、配置和实际入口，不直接套用独立项目目录结构 |
| Vercel | 独立项目配置、外部数据库/对象存储、静态构建产物 | 核对 serverless 限制；本地可写目录不等于持久化存储 |

当前核心要求 Node `^22.13.0 || >=24`，仓库固定 pnpm `12.11.2`。以目标 checkout 的 `engines`、`packageManager`、锁文件和 CI 为准；旧 README badge、`pkg` 的 node10 targets 不能作为当前运行要求。源码启动后端默认 8360；Vite 开发界面默认 3000，两者用途不同。

## 安装独立站点

从可信且确实包含所需能力的版本开始；本技能基线仍标记 2.8.0，已发布的同号包不一定包含 MCP。

```sh
npx firekylin new my-blog
cd my-blog
npm start
```

人工安装优先交互输入数据库与管理员凭据，避免密码进入命令历史。初始化支持 SQLite、MySQL、TiDB、PostgreSQL；TiDB 使用 MySQL 协议和 TLS 证书校验。完成后验证首页、后台登录、草稿保存、媒体上传与数据库持久化。

- `--skip-install`：初始化后还需安装依赖。
- `--skip-initialize`：仅生成骨架并标记已安装，不连接数据库、不建表、不创建管理员。进程启动不代表站点已初始化。
- 中断初始化可能留下 `data/.firekylin-initializing.json`，其中可能包含敏感值；限制访问，不粘贴到日志或工单。
- CLI、站点项目与核心仓库各自使用已有包管理器，不在同一项目混用锁文件。升级 pnpm 时同步 packageManager、工作流与安装方式。

## 配置、数据库与迁移

独立项目读取 `firekylin.config.js`；旧模式读取核心配置。先确认 `lib/project-context.js` 的模式判断和 `src/config/adapter.js` 实际模型配置，随后只报告类型、目标环境和必要的非敏感诊断值。

旧部署可能用 `FK_DB_MODE/HOST/PORT/DATABASE/USER/PASSWORD/PREFIX/ENCODING/PATH` 覆盖数据库配置。检查变量是否存在，不输出所有变量。SQLite 的目录和数据库名需按适配器实现核对，不仅凭配置字符串猜测最终文件名。

迁移前记录数据库类型、版本、表前缀、字符集和 schema 状态。TiDB 按 MySQL 方言处理；空前缀也是一种合法的既有布局，不能擅自改成 `fk_`。CLI 新建默认前缀与既有数据库迁移是不同流程。

当前 OAuth 引入持久化表；检查 `src/mcp/oauth-schema.js` 的建表和 schema 确保逻辑。先在备份副本或测试库验证，再运行部署对应的初始化/迁移流程。不要把“SQL 生成正确”报告成“所有数据库实库验证通过”，也不要在生产执行猜测的 ALTER/DELETE 来消除报错。

## 备份、升级与回滚

业务导出只保存相应内容格式，不能替代整站备份。备份应覆盖：

1. 一致的数据库快照（SQLite 使用支持一致性的方法，避免运行中只复制主文件而遗漏 WAL 中的数据）。
2. 项目配置与密钥、主题和插件、上传文件或对象存储对象；密钥备份单独加密并限制访问。
3. 部署清单、依赖与锁文件、当前核心版本/commit、卷映射及恢复步骤。

先确认备份可恢复。升级独立项目时更新 `firekylin` 依赖，保留项目自己的主题、配置、数据和上传目录。不要修改 `node_modules` 当作长期补丁；需要补丁就固定可追踪版本。旧后台“系统升级”属于既有发布包下载覆盖流程，不能直接套用于独立 npm 项目；检查下载来源、完整性与覆盖范围后再选择升级方案。

在测试环境恢复备份并升级，验证首页/文章/后台、草稿和评论、上传、主题插件、MCP 登录与读写。生产切换沿用用户已有授权；没有部署授权时提交具体变更和回滚方案供审阅。记录何时需要回滚代码、何时需要恢复数据库；只回退依赖不保证兼容升级后的 schema。

## MCP 与 OAuth 运维

先核对部署代码支持 OAuth，而不是套用旧 `mcp.tokens` 文档。最小项目配置示意：

```js
module.exports = {
  // 保留项目已有数据库、主题、插件等配置
  mcp: {
    enabled: true,
    requireHttps: true,
    allowedOrigins: ['https://your-mcp-client.example']
  }
};
```

此示例只展示字段，不能覆盖整个现有配置。旧模式配置来自 `think.config('mcp')`。`allowedOrigins` 管浏览器 Origin；它不替代 access token，非浏览器请求没有 Origin 也仍须认证。

- `site_url` 应为规范的站点 origin，例如 `https://blog.example.com`，不带路径、查询或 fragment。生产使用 HTTPS；HTTP 例外只适用于实现允许的 loopback 地址。
- 代理配置要让应用识别正确协议和 origin。不要关闭 HTTPS 校验或相信任意 Host 来绕过配置问题。
- 远程客户端连接 `/mcp`，通过发现元数据、浏览器后台 JWT 登录、授权同意和 PKCE S256 获取 OAuth token。详见 [协议参考](mcp-tools.md)。
- access token、refresh token、授权码和持久化 consent 有不同生命周期。刷新 token 单次使用并轮换；撤销某个 token 不等于撤销全部关联 token。
- OAuth 每次认证检查用户实时状态与角色。后台 JWT 有独立有效期和密钥策略；后台退出登录不等于撤销 MCP token，二者不可混用。
- 日志只记录必要的状态码、请求 ID、工具名和错误类别；不记录 Authorization、Cookie、完整请求正文或数据库凭据。

## 排错顺序

| 症状 | 优先检查 | 验证结果 |
| --- | --- | --- |
| 站点无法启动 | Node、依赖安装、SQLite 原生模块、配置模式、数据库连通性与写权限 | 实际 HTTP 页面和数据库查询可用 |
| 后台登录失败 | 用户类型/状态、密码、2FA/LDAP 配置、Cookie HTTPS/domain、JWT 配置 | 浏览器完整登录流程成功，避免仅验证密码函数 |
| MCP 404 | 是否支持该版本、enabled 配置、代理路径 | 客户端可初始化并发现工具 |
| MCP 401 | OAuth token 过期/撤销、refresh 轮换、用户禁用 | 正常重新授权或刷新后成功调用 |
| MCP 403 | HTTPS/origin、用户角色、scope、具体工具权限 | 授权范围内成功，越权仍被拒绝 |
| 工具缺失 | 实时 tools/list、scope、角色、requiresApproval 隐藏规则 | 确认客户端实际可用名，不通过改策略绕过 |
| 工具报错 | 检查 MCP `isError` 和业务错误；后台 HTTP 200 也可能 `errno` 失败 | 重新读取对象确认结果 |
| 上传失败 | 数据大小/格式、上传 provider 配置、权限、对象 URL | 对象可读取且无凭据泄露 |
| 插件不生效 | 扫描目录/依赖类型、manifest、activate 日志、冲突、进程重载 | 路由/Widget/工具实测且无重复注册 |
| 导入或 RSS 重复内容 | 原格式、pathname 冲突、计划任务、外部源与批次结果 | 小批量复现；核对对象数和公开状态 |

当前 RSS 定时任务在普通运行模式执行，Vercel 模式禁用相关 cron；自动导入可发布内容，迁移/恢复后要防止重复执行。Vercel 静态构建只准备静态资源，动态服务仍需要可用数据库、上传后端和稳定的认证配置。

## 核心开发与 CI

在可信 checkout 内按固定版本安装，不提交环境凭据：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm test:plugin
pnpm test:widget
pnpm test:auth
pnpm test:cli
pnpm test:types
```

按改动范围选择验证；上述是完整核心检查清单，不要求文档小改重复跑全部测试。数据库/模型相关回归还可运行 `node --test test/service/*.test.js`；根据目标数据库补充真实集成验证。pre-commit 会调用 lint，不能关闭 hook 来掩盖代码错误。

| 工作流 | 触发与职责 |
| --- | --- |
| test | push/PR，Node 22/24 的安装、构建、lint 与测试 |
| Docker build 校验 | PR commit，amd64/arm64 构建，不推送镜像 |
| Docker release | master 的 package.json 变更，版本与该事件 before 不同才构建并 push 版本标签和 latest |
| npm 发布 | master 的版本变化按工作流条件发布 |
| release | 以该工作流的版本比较与发布条件制作发布产物；与 Docker/npm 不是同一套触发逻辑 |

Docker 的“版本不同”不能解读成严格 SemVer 递增。发布前检查版本、changelog、锁文件、产物内容和仓库 secret 绑定。构建成功不能证明容器可启动；还需在测试环境用发布产物启动，验证入口依赖、卷持久化、HTTP、数据库和插件加载。`npm pack --dry-run` 可检查包内文件，尤其 CLI 的 `lib/`、类型和技能资料。不要把现有旧 `pkg` targets 当作现代 Node 兼容性证明。

完成后报告源码/依赖版本、验证范围、部署状态与回滚依据，明确区分创建 PR、合并、部署和正式发布。
