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


## 安装

推荐通过 CLI 创建独立的 Firekylin 项目。核心程序安装在 `node_modules`，项目目录只保存配置、主题、上传文件和数据，升级时不会覆盖用户文件：

```sh
npx firekylin new my-blog
cd my-blog
npm start
```

初始化命令会交互式选择 SQLite、MySQL 或 PostgreSQL，建立数据表并创建管理员账号。默认主题会复制到 `themes/firekylin`，后续升级不会覆盖这份主题。

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

MySQL/PostgreSQL 另使用 `--db-host`、`--db-port`、`--db-name`、`--db-user` 和 `--db-password`。命令行密码可能进入 shell history；交互安装更适合人工部署。使用 `--skip-install` 时需在初始化后自行执行包管理器的安装命令。

旧版“源码目录即站点目录”的 `production.js`、`development.js` 和网页安装流程仍保留，供已有部署继续使用。

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


## 开发者文档

- [主题开发](https://github.com/firekylin/firekylin/wiki/%E4%B8%BB%E9%A2%98%E5%BC%80%E5%8F%91)
- [贡献代码](https://github.com/firekylin/firekylin/wiki/%E8%B4%A1%E7%8C%AE%E4%BB%A3%E7%A0%81)

### 扩展 Widget

项目可以在 `firekylin.config.js` 中声明 Widget 入口。入口相对项目根目录解析，并在 worker 启动时加载：

```js
module.exports = {
  database: {/* ... */},
  widgets: ['./widgets/index.js']
};
```

入口导出一个同步初始化函数。函数收到稳定的 `Widget` 基类，并返回“名称 → Widget 类”的映射：

```js
module.exports = ({Widget}) => ({
  Widget_Custom_Posts: class extends Widget {
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


## 捐赠支持

你的每一份帮助都将使 Firekylin 做的更好，走的更远！我们一直在坚持不懈地努力，并坚持让 Firekylin 完全开源免费，你的帮助将使我们更有动力和信心！

欢迎使用支付宝或者微信扫描二维码进行捐赠！已捐赠用户将在 [捐赠列表](https://github.com/firekylin/firekylin/wiki/捐赠列表) 中列出。

<div class="donate-qrcode">
<img width="300" src="https://p5.ssl.qhimg.com/t013f422b5b319becbb.png" alt="donate by alipay" /> <img width="300" src="https://p4.ssl.qhimg.com/t0142965a40989b8d7a.png" alt="donate by wechat" />
</div>
