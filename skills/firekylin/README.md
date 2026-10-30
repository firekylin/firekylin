# Firekylin Agent Skill

AI guidance for three working roles: site users, theme/plugin developers, and system maintainers.

Start with [SKILL.md](SKILL.md). Load detailed references as needed for capabilities, workflows, verification, MCP/OAuth, and the 15 built-in tool declarations.

## Install and invoke

Copy the entire trusted `skills/firekylin/` directory, including references and scripts, into your client's supported skill location. Codex projects can use `.agents/skills/firekylin/`; Claude Code projects can use `.claude/skills/firekylin/`. Follow other clients' loading rules. Copying only SKILL.md breaks reference links.

Example project installation: first check whether the destination already contains custom files; do not overwrite an existing skill.

```sh
mkdir -p .agents/skills
cp -R /path/to/firekylin/skills/firekylin .agents/skills/firekylin
```

A client may also support loading the directory directly. For npm installations, verify that the selected version actually includes `node_modules/firekylin/skills/firekylin/`. Repository features may not yet be published.

Example prompts:

- `Use $firekylin as a site user to save these notes as a private draft and verify the result.`
- `Use $firekylin to generate and test a configurable public announcement plugin in a new local directory; do not install or publish it.`
- `使用 $firekylin，根据我的需求生成完整 Firekylin 插件，包括配置、说明、测试和运行验证。`
- `Use $firekylin as a theme/plugin developer to add a recent-posts Widget.`
- `Use $firekylin as a maintainer to review upgrades, database backups, and MCP authorization.`

Invocation syntax varies by client; you can also ask it to load the Firekylin skill. On first use, ask the skill to connect your blog. It will request the public blog address, check the site's management endpoint, use the client's supported connection flow, and guide you through Firekylin login and authorization. Some clients may require a restart or a new conversation before the connection becomes available.

Installing the skill does not grant site permissions by itself. Never paste a password, Cookie, authorization code, access token, or refresh token into chat. File access alone supports development or preparing content, not claiming remote changes occurred.

## Contents

| File | Purpose |
| --- | --- |
| [SKILL.md](SKILL.md) | Role routing, operation order, authorization, verification |
| [users.md](references/users.md) | Content, pages, comments, media, settings, imports/exports |
| [plugin-generation.md](references/plugin-generation.md) | Requirements → extension selection → complete files → verification → handoff |
| [scaffold-plugin.cjs](scripts/scaffold-plugin.cjs) | Generate a CommonJS plugin with configuration, README and real manager tests; no installation |
| [verify-plugin.cjs](scripts/verify-plugin.cjs) | Static manifest, compatibility, path and syntax checks; does not execute the plugin |
| [plugin starter](assets/plugin/README.md) | Bundled source/config/tests template used by the scaffold script |
| [developers.md](references/developers.md) | Eta, Widgets, plugins, hooks, routes, templates, tools |
| [maintainers.md](references/maintainers.md) | Installation, databases, backups, authentication, upgrades, CI/releases |
| [mcp-tools.md](references/mcp-tools.md) | Connections, scopes, parameters, results, troubleshooting |
| [tools.json](references/tools.json) | Built-in Registry snapshot, not live tools/list |
| [source-map.md](references/source-map.md) | Implementation locations and documentation maintenance |
| [export-tools.cjs](scripts/export-tools.cjs) | Export metadata from trusted source without executing operations |

Baseline: master `d3d00ec`, 2026-10-13. Runtime discovery and current source take precedence.

Plugin generation requires a client with Skill loading and authorized file operations. Runtime verification also requires command execution and a matching Firekylin installation. MCP alone cannot write plugin source to a site. The `firekylin plugin` CLI remains a Widget-only scaffold. Plugin guidance was refreshed against `e10a576` (2.17.1); other role snapshots retain their stated baseline.
