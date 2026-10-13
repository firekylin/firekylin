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
- `Use $firekylin as a theme/plugin developer to add a recent-posts Widget.`
- `Use $firekylin as a maintainer to review upgrades, database backups, and MCP authorization.`

Invocation syntax varies by client; you can also ask it to load the Firekylin skill. **Installing a skill does not install the service, connect MCP, or grant site permissions.** Remote operations require the site's `/mcp` connection and OAuth authorization. File access alone supports development or preparing content, not claiming remote changes occurred.

## Contents

| File | Purpose |
| --- | --- |
| [SKILL.md](SKILL.md) | Role routing, operation order, authorization, verification |
| [users.md](references/users.md) | Content, pages, comments, media, settings, imports/exports |
| [developers.md](references/developers.md) | Eta, Widgets, plugins, hooks, routes, templates, tools |
| [maintainers.md](references/maintainers.md) | Installation, databases, backups, authentication, upgrades, CI/releases |
| [mcp-tools.md](references/mcp-tools.md) | Connections, scopes, parameters, results, troubleshooting |
| [tools.json](references/tools.json) | Built-in Registry snapshot, not live tools/list |
| [source-map.md](references/source-map.md) | Implementation locations and documentation maintenance |
| [export-tools.cjs](scripts/export-tools.cjs) | Export metadata from trusted source without executing operations |

Baseline: master `d3d00ec`, 2026-10-13. Runtime discovery and current source take precedence.
