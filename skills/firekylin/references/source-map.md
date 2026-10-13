# 源码导航与文档维护

路径相对于 Firekylin 核心仓库根目录；复制本技能后需另行取得匹配版本的源码。基线为 master `d3d00ec`（2026-10-13），package.json 2.8.0，仅用于定位，不能据此判断 npm 同号包具有这些实现。

| 能力 | 主要实现与验证位置 |
| --- | --- |
| 独立项目 CLI、初始化、模式识别 | `bin/firekylin.js`、`lib/cli.js`、`lib/installer.js`、`lib/project-context.js`、`lib/start.js`；`test/cli/` |
| 数据库和运行配置 | `src/config/adapter.js`、`src/config/db.js`（旧部署的本地配置，不随仓库分发）、`src/config/`；`firekylin.config.js` 是站点项目文件 |
| 后台账户、JWT、导入归属 | `src/controller/admin/`、`src/service/admin-auth.js`；`docs/admin-jwt.md`、`test/service/admin-auth.test.js`、`test/service/hugo-import.test.js`、`test/plugin/jwt-route.test.js` |
| 文章、页面、分类、标签、评论 | `src/model/`、`src/controller/admin/api/`；生命周期在模型和服务中，不能用裸 SQL 替代 |
| Markdown 与渲染 | `src/model/post.js`、主题模板、Widget 内容渲染；关注过滤器与可信 HTML 边界 |
| 导入、导出、RSS、跨站推送 | `src/service/import/`、`src/service/export/`、`src/controller/admin/cron.js`、后台相关 API |
| 上传与对象存储 | `src/controller/admin/api/file.js`、`src/service/upload/`、`src/plugin/media-tools.js` |
| Eta 主题与公开页面 | `src/controller/index.js`、`src/controller/post.js`、`src/controller/base.js`、`src/widget/`、`www/theme/firekylin/`；`test/widget/` |
| 插件生命周期与发现 | `src/plugin/manager.js`、`runtime.js`；`docs/plugins.md`、`test/plugin/` |
| Hooks、路由、模板注册 | `src/plugin/events.js`、`routes.js`、`middleware.js`、`templates.js`；类型见 `types/` |
| 内置工具和所有者注册 | `src/plugin/tools.js`、`content-tools.js`、`management-tools.js`、`media-tools.js` |
| MCP HTTP bridge 与工具过滤 | `src/mcp/server.js`、`middleware.js`、`config.js`；`test/plugin/` 中 MCP 测试 |
| OAuth 认证、schema、存储、端点 | `src/mcp/oauth-auth.js`、`oauth-schema.js`、`oauth-store.js`、`oauth-utils.js`、`oauth.js`、`oauth-middleware.js` |
| Vercel 与发布包装 | `lib/vercel-static.js`、Vercel 入口/配置、`Dockerfile`、`.github/workflows/`、包发布相关脚本 |
| 工程约束 | `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、ESLint 配置、`test/types/` |

## 修改技能时的检查

1. 查实际实现、测试和运行结果，区分旧文档、当前源码与已发布产物。
2. 变更内置 Tools 时运行 [导出脚本](../scripts/export-tools.cjs)，更新 [tools.json](tools.json) 和 [工具参考](mcp-tools.md)；另外核对 scope、运行时权限与远程隐藏策略。
3. 变更 Widget/主题 API 时核对 FieldAccessor、游标、缓存和模板转义；用真实 Eta 编译/渲染示例。
4. 变更 OAuth/角色时同步使用者、维护者和工具参考；不把本地测试当成生产全客户端兼容性证明。
5. 保持 SKILL 入口简短，详细内容放角色指南；所有技能内部相对链接应在复制整个目录后可用。
6. 检查 npm 包是否带上技能文件；更新源码不等于 npm/Docker 已发布。

只导出公开结构和合成示例，不把测试站点 token、用户内容或真实连接配置写入技能。
