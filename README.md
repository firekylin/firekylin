<div align="center">
  <a href="https://github.com/firekylin/Firekylin">
    <!-- <img width="200" heigth="200" src="https://s1.ssl.qhres2.com/static/0c8555d630012930.svg"> -->
    <img width="250" height="262" src="https://s3.ssl.qhres2.com/static/70ad177f02b6e7ae.svg">
  </a>  

  <h1>Firekylin</h1>

  <div>
    <a href="https://github.com/firekylin/firekylin">
      <img src="https://img.shields.io/badge/node-%3E%3D8.9.4-red.svg?style=flat-square" alt="node version required" />
    </a>
    <a href="https://github.com/firekylin/firekylin/releases">
      <img src="https://img.shields.io/github/release/firekylin/firekylin.svg?style=flat-square" alt="GitHub release" />
    </a>
    <a href="https://github.com/firekylin/firekylin/releases">
      <img src="https://img.shields.io/github/downloads/firekylin/firekylin/total.svg?style=flat-square" alt="Github All Releases" />
    </a>
  </div>
  <div>
    <a href="https://github.com/firekylin/firekylin/issues?q=is%3Aissue+is%3Aclosed">
      <img src="https://img.shields.io/github/issues-closed-raw/firekylin/firekylin.svg?style=flat-square" alt="" />
    </a>
    <a href="https://github.com/firekylin/firekylin/blob/master/LICENSE">
      <img src="https://img.shields.io/github/license/firekylin/firekylin.svg?colorB=f48041&style=flat-square" alt="license" />
    </a>
    <a href="https://gitter.im/firekylin/firekylin?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge">
      <img src="https://img.shields.io/gitter/room/firekylin/Lobby.svg?style=flat-square&colorB=96c312" alt="Gitter" />
    </a>
  </div>

  <p>A Simple & Fast Node Blogging Platform Base On ThinkJS 3 & ReactJS & ES2015+.</p>
</div>


## AI 使用指南

[Firekylin Agent Skill](skills/firekylin/SKILL.md) 按系统使用者、主题/插件开发者、系统维护者三类角色说明能力和操作流程，包含 MCP/OAuth 与工具参数参考。复制整个技能目录即可交给支持 Skill 的 AI 客户端；安装和调用方法见 [技能说明](skills/firekylin/README.md)。

## 安装

推荐通过 CLI 创建独立的 Firekylin 项目。核心程序安装在 `node_modules`，项目目录只保存配置、主题、上传文件和数据，升级时不会覆盖用户文件：

```sh
npx firekylin new my-blog
cd my-blog
npm start
```

初始化命令会交互式选择 SQLite、MySQL、TiDB 或 PostgreSQL，建立数据表并创建管理员账号。TiDB 复用 MySQL 协议，并自动启用 TLS 1.2 及证书校验。默认主题会复制到 `themes/firekylin`，后续升级不会覆盖这份主题。

开发模式使用 `npm run dev`（等价于 `firekylin -D`）。升级核心程序时在项目中更新 `firekylin` 依赖即可。

### 非交互安装

CI 或容器中可通过参数完成初始化：

```sh
npx firekylin new my-blog --non-interactive --skip-install \
  --db-type sqlite --db-path data/firekylin.sqlite --db-prefix fk_ \
  --site-title "My Blog" --site-url "https://example.com" \
  --admin-user admin --admin-password 'change-me' --admin-email admin@example.com \
  --package-manager npm
```

MySQL/TiDB/PostgreSQL 另使用 `--db-host`、`--db-port`、`--db-name`、`--db-user` 和 `--db-password`。命令行密码可能进入 shell history；交互安装更适合人工部署。使用 `--skip-install` 时需在初始化后自行执行包管理器的安装命令。

如果数据库和表已经存在，或准备稍后手工填写 `firekylin.config.js`，可以使用 `--skip-initialize`。该选项只创建项目骨架并标记为已安装，不会进入交互配置，也不会连接数据库、建库、建表或创建管理员。可通过 `--db-type` 指定配置骨架的数据库类型，未指定时默认为 SQLite。

旧版“源码目录即站点目录”的 `production.js`、`development.js` 和网页安装流程仍保留，供已有部署继续使用。

### 多实例 / Serverless 后台登录

后台认证使用无状态 JWT Cookie，签名密钥由数据库中的 `jwt_secret` 统一保存，旧版 `comment_jwt_secret` 会自动迁移，无需额外环境变量。首次升级需要重新登录。详细说明参见 [JWT 认证和迁移文档](docs/admin-jwt.md)。

### 评论社交登录

评论登录支持 Waline OAuth 服务提供的 GitHub、微博、QQ、OIDC 等社交账号。默认使用 `https://oauth.lithub.cc`，也可以通过 `OAUTH_URL` 环境变量指向[自行部署的 Waline Auth 服务](https://github.com/walinejs/auth)。首次社交登录会自动创建“评论者”用户；已登录的后台用户可以在自己的用户编辑页绑定或解绑社交账号，管理员可在用户列表查看绑定情况。

## 如何使用

- [添加和管理文章](https://github.com/firekylin/firekylin/wiki/%E6%96%87%E7%AB%A0)
- [添加和管理页面](https://github.com/firekylin/firekylin/wiki/%E9%A1%B5%E9%9D%A2)
- [添加和管理推送](https://github.com/firekylin/firekylin/wiki/%E6%8E%A8%E9%80%81)
- [调整网站外观](https://github.com/firekylin/firekylin/wiki/%E4%B8%BB%E9%A2%98%E5%A4%96%E8%A7%82)
- [系统设置](https://github.com/firekylin/firekylin/wiki/%E7%B3%BB%E7%BB%9F%E8%AE%BE%E7%BD%AE)
- [如何优化博客主题](https://welefen.com/post/how-to-optimize-firekylin-theme.html)

## 常见问题

如果您在使用过程中遇到问题，请查看 [问题解答](https://github.com/firekylin/firekylin/wiki/问题解答) 中的解答，或者在 [GitHub](https://github.com/firekylin/firekylin/wiki/issues) 上提问。

## 用户列表

如果你的博客也是用 FireKylin 构建的，请到 https://github.com/firekylin/firekylin/issues/34 提交网址。


## 内置 MCP Server

Firekylin 自带 MCP HTTP 服务，无需安装额外插件，也不需要手工创建 Token 或配置用户 ID。默认地址为 `/mcp`，客户端通过 OAuth 2.1 跳转到 Firekylin 登录并确认授权，自动获取与当前用户绑定的访问令牌。可以让 Codex、Claude Code 等 MCP 客户端在授权范围内读取文章、管理草稿（高风险发布、删除操作仍需要单次审批支持）。使用和安全说明见 [MCP Server 文档](docs/mcp.md)。

## 开发者文档

- [主题开发](https://github.com/firekylin/firekylin/wiki/%E4%B8%BB%E9%A2%98%E5%BC%80%E5%8F%91)
- [主题文章字段](docs/theme-fields.md)
- [贡献代码](https://github.com/firekylin/firekylin/wiki/%E8%B4%A1%E7%8C%AE%E4%BB%A3%E7%A0%81)

### 扩展 Widget

在 Firekylin 项目目录中可以用 CLI 快速创建并登记一个 Widget 插件：

```sh
firekylin plugin recent-posts
```

命令会生成 `plugins/recent-posts/`（包含实现、类型声明和使用说明），并把入口写入 `firekylin.config.js` 的 `widgets` 数组。插件名使用字母、数字和连字符；生成后重启 worker 即可加载。

项目可以在 `firekylin.config.js` 中声明 Widget 入口。入口相对项目根目录解析，并在 worker 启动时加载：

```js
module.exports = {
  database: {/* ... */},
  widgets: ['./widgets/index.js']
};
```

入口导出一个同步初始化函数。函数会收到稳定的 `Widget`、`ContentsWidget` 和 `MetasWidget` 基类，并返回“名称 → Widget 类”的映射。内容类 Widget 推荐继承 `ContentsWidget`，以复用 permalink、摘要、分类标签、作者和权限等处理：

```js
module.exports = ({ContentsWidget}) => ({
  Widget_Custom_Posts: class extends ContentsWidget {
    async execute() {
      const limit = Number(this.parameter.limit) || 5;
      const rows = await this.model('post').limit(limit).select();
      this.pushAll(rows);
    }
  }
});
```

主题也可以在自身的 `package.json` 中声明入口。只有当前启用主题的服务端代码会被加载：

```json
{
  "firekylin": {
    "widgets": "./widgets/index.js",
    "widgetOverrides": ["Widget_Contents_Post_Recent"]
  }
}
```

模板调用方式与内置 Widget 相同：

```eta
<% const posts = await firekylin.widget('Widget_Custom_Posts', {limit: 8}); %>
<% while (posts.next()) { %><a href="<%= posts.permalink %>"><%= posts.title %></a><% } %>
```

Widget 重名默认会阻止启动或渲染，并同时报告两个来源。需要替换已有 Widget 时，必须在项目配置或主题的 `firekylin` 配置中通过 `widgetOverrides` 显式列出名称。主题不能覆盖用于确定当前主题的 `Widget_Options`。扩展代码运行在 Firekylin 服务端进程中，应只安装可信扩展；修改后需重启 worker。

文章或页面模板可以通过一行输出内置评论区：

```eta
<%~ firekylin.comment() %>
```

`comment()` 会自动判断当前内容是否允许评论，并读取后台的分页、语言及强制登录设置。主题无需自行引入评论客户端或编写初始化脚本。可选参数包括 `className`、`title`、`loadingText` 和 Waline `dist` 目录地址 `resourceURL`：

```eta
<%~ firekylin.comment({className: 'article-comments', title: '评论'}) %>
```

如需升级 Waline 客户端或使用自建 CDN，可以指定资源目录，Firekylin 会在其下加载 `waline.js` 和 `waline.css`：

```eta
<%~ firekylin.comment({resourceURL: 'https://cdn.jsdelivr.net/npm/@waline/client@3.17.0/dist'}) %>
```

通过 `firekylin new` 创建的项目会在根目录包含 `firekylin.d.ts`。支持 TypeScript 类型服务的编辑器或 Eta 插件可据此补全内置 Widget 名称、参数、数据字段和实例方法；声明只提供编辑期提示，不会改变 Widget 的注册和运行行为。类型主体由 `firekylin` 依赖提供，因此升级依赖即可同步最新定义。已有项目也可以手动添加：

```ts
/// <reference types="firekylin" />
```

自定义 Widget 可以在项目中的任意 `.d.ts` 文件里扩展注册表：

```ts
declare namespace Firekylin {
  interface CustomPostsParameters {
    limit?: number;
  }

  class CustomPostsWidget extends ContentsWidget<ContentRow, CustomPostsParameters> {
    featured(): boolean;
  }

  interface WidgetRegistry {
    Widget_Custom_Posts: WidgetDefinition<CustomPostsParameters, CustomPostsWidget>;
  }
}
```

之后调用 `firekylin.widget('Widget_Custom_Posts', {limit: 8})` 时，参数和返回实例都会按扩展声明进行推导。带缓存标识的名称（如 `Widget_Custom_Posts@sidebar`）也会使用同一份 Widget 类型。


## 捐赠支持

你的每一份帮助都将使 Firekylin 做的更好，走的更远！我们一直在坚持不懈地努力，并坚持让 Firekylin 完全开源免费，你的帮助将使我们更有动力和信心！

欢迎使用支付宝或者微信扫描二维码进行捐赠！已捐赠用户将在 [捐赠列表](https://github.com/firekylin/firekylin/wiki/捐赠列表) 中列出。

<div class="donate-qrcode">
<img width="300" src="https://p5.ssl.qhimg.com/t013f422b5b319becbb.png" alt="donate by alipay" /> <img width="300" src="https://p4.ssl.qhimg.com/t0142965a40989b8d7a.png" alt="donate by wechat" />
</div>

### 评论验证码和邮件通知

在后台「评论设置」选择 Turnstile 或 reCAPTCHA v3，并填写公开 Site Key。
服务器通过环境变量 `TURNSTILE_KEY` 或 `RECAPTCHA_SECRET` 配置对应私钥，重启生效。
匿名评论校验失败时拒绝提交；reCAPTCHA v3 最低分数为 0.5，登录用户免验证码。

开启「评论邮件通知」后，配置 `SMTP_HOST`、`SMTP_FROM`，以及按需配置
`SMTP_USER`、`SMTP_PASS` 和站长收件地址 `AUTHOR_EMAIL`。
`SMTP_PORT` 默认 465，直接 TLS 默认开启；使用 587/STARTTLS 时设置 `SMTP_SECURE=false`。
新评论通知站长，已审核回复通知被回复者，自回复不会发送给本人。
发送失败不影响评论保存。此设置不包含账号验证或密码找回邮件。
私钥和 SMTP 凭据仅配置于服务器环境变量。
