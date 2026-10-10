# Firekylin 插件开发指南

Firekylin 插件用于在不修改核心代码和主题文件的情况下，为站点增加业务逻辑、数据能力、页面能力和第三方服务集成。插件运行在 Node.js 进程中，属于可信服务端代码，目前不是安全沙箱。

## 插件能做什么

- 在文章、页面、用户创建/更新/删除后执行自动化逻辑；
- 修改 Markdown、HTML 正文和文章摘要；
- 添加推荐文章、统计数据和外部 API 数据 Widget；
- 向 Eta 模板提供异步函数、过滤器和主题 Slots；
- 增加公开 API、Webhook 和管理员 API；
- 集成对象存储、搜索、通知、SEO 和统计服务。

Firekylin 当前没有内置评论持久化模块，评论由 Disqus、Gitalk、Waline 等第三方服务提供，因此评论 Hook、Feed、XML-RPC 和后台管理扩展暂未纳入当前插件 API。

## 创建和使用插件

插件放置在项目的 `plugins/<plugin-id>/` 目录：

```text
plugins/
└── reading-stats/
    ├── package.json
    ├── plugin.js
    └── README.md
```

Firekylin 启动时扫描插件目录并加载插件。插件元数据直接使用 `package.json`，不需要额外的 `manifest.json`：

```json
{
  "name": "firekylin-plugin-reading-stats",
  "version": "1.0.0",
  "description": "文章阅读统计插件",
  "main": "plugin.js",
  "license": "MIT",
  "engines": { "firekylin": ">=2.5.5" },
  "firekylin": {
    "type": "plugin",
    "id": "reading-stats",
    "entry": "plugin.js",
    "permissions": ["content:read", "settings:read"]
  }
}
```

`main` 是默认入口，`firekylin.entry` 可以覆盖它。`firekylin.id` 是稳定的插件 ID，用于路由和日志，建议不要随显示名称改变。Firekylin 版本约束可以写在 `engines.firekylin` 或 `firekylin.engine`。

入口模块必须导出 `register(ctx)`，`activate(ctx)` 和 `deactivate(ctx)` 可选：

```js
module.exports = {
  register(ctx) {
    // 注册事件、路由、Widget 和模板扩展
  },
  async activate(ctx) {
    // 插件启用时执行
  },
  async deactivate(ctx) {
    // 插件停用时清理资源
  }
};
```

生命周期为：扫描并校验 `package.json` → 加载入口 → `register(ctx)` → `activate(ctx)`。停用时调用 `deactivate(ctx)`，并自动移除该插件注册的事件、路由、模板扩展和 Widget。

## Events / Hooks

插件通过异步事件总线注册 Hook：

```js
ctx.events.on('post.created', async ({post}) => {
  ctx.logger.info(`文章已创建：${post.id}`);
});
```

监听器支持 `priority`，数字越小越先执行。通知型事件用于执行副作用；过滤型事件会将上一个监听器的返回值传给下一个监听器，返回 `undefined` 表示保留原值。

### 通知型事件

```text
app.ready
user.created
post.created
post.updated
post.beforeDelete
post.deleted
page.created
page.updated
content.created
content.updated
archive.index
archive.search
theme.beforeRender
theme.afterRender
```

### 过滤型事件

```text
user.beforeCreate
content.beforeCreate
content.beforeUpdate
content.markdown
content.html
content.excerpt
content.render
```

例如给文章正文追加声明：

```js
ctx.events.on('content.html', async html => {
  return `${html}<p class="copyright">本文内容来自本站</p>`;
});
```

常见上下文包括：`{post}`、`{page}`、`{user, ip}`、`{controller, type}`、`{controller, name, theme, response}`。插件异常默认记录并隔离，不会阻断其他插件。

## Widget 扩展

插件可以注册异步 Widget：

```js
register(ctx) {
  class RelatedPosts extends ctx.widgets.ContentsWidget {
    async execute() {
      const posts = await this.model('post').getLatest(null, this.parameter.limit || 5);
      this.pushAll(posts);
    }
  }
  ctx.widgets.register('Widget_Plugin_Related_Posts', RelatedPosts);
}
```

可用基类为 `ctx.widgets.Widget`、`ctx.widgets.ContentsWidget` 和 `ctx.widgets.MetasWidget`。主题中调用：

```eta
<% const related = await firekylin.widget('Widget_Plugin_Related_Posts', {limit: 5}); %>
<% while (related.next()) { %>
  <a href="<%= related.url() %>"><%= related.title %></a>
<% } %>
```

Widget 名称建议使用 `Widget_Plugin_<Name>` 命名空间，避免冲突。插件停用后，插件注册的 Widget 会被移除。

## Eta 模板扩展

### 异步模板函数

```js
ctx.templates.registerFunction('readingStats.badge', async ({post}) => {
  return `<span>${post.view_count || 0} 次阅读</span>`;
});
```

```eta
<%= await plugin.readingStats.badge({post}) %>
```

### 模板过滤器

```js
ctx.templates.registerFilter('readingStats.compactNumber', value => {
  const number = Number(value) || 0;
  return number >= 10000 ? `${(number / 10000).toFixed(1)} 万` : String(number);
});
```

```eta
<%= await filters['readingStats.compactNumber'](post.view_count) %>
```

### 主题 Slots

```js
ctx.templates.registerSlot('post.after', () => '<aside>推荐阅读</aside>');
```

主题需要显式渲染 Slot：

```eta
<%~ await slots.render('post.after') %>
```

模板扩展支持 Promise，可以在函数或过滤器中查询数据库、调用外部服务或使用 Widget。

## 路由和 Action

插件可以注册公开 API、Webhook 或管理员 API：

```js
ctx.routes.register({
  method: 'POST',
  path: '/refresh/:id',
  auth: 'admin',
  csrf: true,
  async handler({params, query, body, ctx: requestContext}) {
    return {
      id: params.id,
      force: query.force === '1',
      accepted: Boolean(body),
      path: requestContext.path
    };
  }
});
```

实际地址会自动添加插件命名空间：

```text
/api/plugins/<plugin-id>/refresh/123
```

支持 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`。路由选项：

- `auth: 'public'`：默认公开访问；
- `auth: 'admin'`：要求当前登录用户为管理员；
- `csrf: true`：修改类请求默认校验 `X-CSRF-Token`；
- `csrf: false`：插件必须自行完成 Webhook 签名等安全校验。

Action handler 接收 `{ctx, params, query, body, plugin}`，返回值自动作为 HTTP 响应体。路由冲突会在注册时拒绝，插件停用时自动移除路由。

## 完整 Demo：阅读统计插件

### `package.json`

```json
{
  "name": "firekylin-plugin-reading-stats",
  "version": "1.0.0",
  "main": "plugin.js",
  "engines": { "firekylin": ">=2.5.5" },
  "firekylin": { "type": "plugin", "id": "readingStats" }
}
```

### `plugin.js`

```js
module.exports = {
  register(ctx) {
    ctx.events.on('post.created', async ({post}) => {
      ctx.logger.info(`reading-stats: post ${post.id} created`);
    });

    ctx.events.on('content.html', async html => {
      return `${html}<div class="reading-stats">欢迎阅读</div>`;
    });

    class RelatedPosts extends ctx.widgets.ContentsWidget {
      async execute() {
        const posts = await this.model('post').getLatest(null, 3);
        this.pushAll(posts);
      }
    }
    ctx.widgets.register('Widget_Plugin_Related_Posts', RelatedPosts);

    ctx.templates.registerFunction('readingStats.badge', ({post}) => {
      return `<span class="reading-count">${post.view_count || 0} 次阅读</span>`;
    });
    ctx.templates.registerFilter('readingStats.compactNumber', value => {
      const number = Number(value) || 0;
      return number >= 10000 ? `${(number / 10000).toFixed(1)} 万` : String(number);
    });
    ctx.templates.registerSlot('post.after', () => '<aside>推荐阅读</aside>');

    ctx.routes.register({
      method: 'GET',
      path: '/stats/:id',
      async handler({params}) {
        return {postId: params.id, views: 0};
      }
    });
  },

  async activate(ctx) {
    ctx.logger.info('reading-stats activated');
  },

  async deactivate(ctx) {
    ctx.logger.info('reading-stats deactivated');
  }
};
```

### 主题中的使用

```eta
<% const related = await firekylin.widget('Widget_Plugin_Related_Posts'); %>
<article>
  <h1><%= post.title %></h1>
  <div class="post-content"><%~ post.content %></div>
  <%= await plugin.readingStats.badge({post}) %>
</article>
<% while (related.next()) { %>
  <a href="<%= related.url() %>"><%= related.title %></a>
<% } %>
<%~ await slots.render('post.after') %>
```

## 开发建议

- 插件 ID 保持稳定；
- 过滤器只修改自己负责的字段；
- 事件处理器保持幂等；
- 外部 API 设置超时和失败处理；
- 所有用户输入都要校验和转义；
- 管理员路由使用 `auth: 'admin'` 和 CSRF；
- 不要把数据库连接、密钥或任意 Node 模块直接暴露给 Eta；
- 插件属于可信服务端代码，安装前应审查其依赖和文件读写行为。
