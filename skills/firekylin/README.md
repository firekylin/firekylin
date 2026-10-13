# Firekylin Agent Skill

供 AI 使用的 Firekylin 操作指南，覆盖三类角色：系统使用者、主题/插件开发者、系统维护者。

入口：[SKILL.md](SKILL.md)。详细资料按任务加载，包含实际能力边界、工作流程、验证方法、MCP/OAuth 说明以及内置 15 个工具的声明快照。

## 安装与使用

从可信 Firekylin checkout 复制整个 `skills/firekylin/` 目录（包括 references 和 scripts），放入客户端支持的 Skill 目录。例如 Codex 项目可放在 `.agents/skills/firekylin/`，Claude Code 项目可放在 `.claude/skills/firekylin/`；其他客户端按其 Skill 加载规则配置。不要仅复制 SKILL.md，否则参考资料链接会失效。

项目根目录安装示意，先检查目标是否已有自定义文件，不覆盖既有技能：

```sh
mkdir -p .agents/skills
cp -R /path/to/firekylin/skills/firekylin .agents/skills/firekylin
```

也可在支持 Skill 的客户端中将此目录作为技能来源。若从 npm 包取得，先检查目标版本实际包含 `node_modules/firekylin/skills/firekylin/`；源码中的能力不保证已发布到同号 npm 包。

调用示例：

- `使用 $firekylin，以系统使用者角色，把这份笔记整理成私密草稿并验证保存结果。`
- `使用 $firekylin，以主题/插件开发者角色，为主题添加最近文章 Widget。`
- `使用 $firekylin，以系统维护者角色，检查升级方案、数据库备份和 MCP 授权流程。`

不同客户端的显式调用语法可能不同；也可以直接要求加载 Firekylin 技能。**安装 Skill 不会安装服务、连接 MCP 或授予站点权限。** 操作远程站点还需连接该站点 `/mcp` 并完成 OAuth；仅有文件权限时可以开发或准备稿件，但不能声称已执行远程操作。

## 目录

| 文件 | 用途 |
| --- | --- |
| [SKILL.md](SKILL.md) | 角色选择、操作顺序、授权和验证约束 |
| [references/users.md](references/users.md) | 内容、页面、评论、媒体、设置与导入导出 |
| [references/developers.md](references/developers.md) | Eta、Widget、插件、Hooks、路由、模板与工具 |
| [references/maintainers.md](references/maintainers.md) | 安装、数据库、备份、认证、升级、CI 与发布 |
| [references/mcp-tools.md](references/mcp-tools.md) | 连接、scope、参数、返回值和排错 |
| [references/tools.json](references/tools.json) | 源码内置工具 metadata 快照，不是实时 tools/list |
| [references/source-map.md](references/source-map.md) | 实现定位与同步检查 |
| [scripts/export-tools.cjs](scripts/export-tools.cjs) | 从可信源码生成工具快照，不执行业务操作 |

基线：2026-10-13，master `d3d00ec`。运行时发现与当前源码优先于快照。
