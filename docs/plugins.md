# Firekylin 插件开发指南

Firekylin 插件用于在不修改核心代码和主题文件的情况下，为站点增加业务逻辑、数据能力、页面能力和第三方服务集成。插件运行在 Node.js 进程中，属于可信服务端代码，目前不是安全沙箱。

## 插件能做什么

- 在文章、页面、用户创建/更新/删除后执行自动化逻辑；
- 修改 Markdown、HTML 正文和文章摘要；
- 添加推荐文章、统计数据和外部 API 数据 Widget；
- 向 Eta 模板提供异步函数、过滤器和主题 Slots；
- 增加公开 API、Webhook 和管理员 API；
- 集成对象存储、搜索、通知、SEO 和统计服务。

Firekylin 内置评论持久化和后台管理能力。评论 Hook、Feed、XML-RPC 等扩展点暂未纳入当前插件 API。

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

插件也可以作为 npm 包分发。使用 npm、pnpm 或 Yarn 将插件安装为项目的直接依赖即可，无需再复制到 `plugins` 目录：

```sh
npm install firekylin-plugin-reading-stats
```

Firekylin 会检查项目 `package.json` 中的 `dependencies` 和 `optionalDependencies`，加载其中声明了
`firekylin.type: "plugin"` 的包；普通依赖不会被执行。作用域包（例如
`@example/firekylin-plugin-reading-stats`）同样支持。插件开发者应保留上例中的 `firekylin.type`，并确保
`main` 或 `firekylin.entry` 指向随 npm 包发布的 CommonJS 入口文件。

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

## AI / Agent Tool Registry（实验性）

Firekylin 提供插件级 Tool Registry，供未来 MCP Server、后台 AI 助手和 Agent 共用。
此注册表**不会**自动创建 HTTP 路由，也不会默认赋予插件管理员权限。

```js
module.exports = {
  register(ctx) {
    ctx.tools.register({
      name: 'posts.lookup',
      description: 'Look up a blog post by ID',
      requiredPermissions: ['posts:read'],
      // Optional: JSON Schema, validated by the calling adapter.
      inputSchema: {type: 'object', properties: {id: {type: 'integer'}}, required: ['id']},
      async execute(input, context) {
        // Replace with the authorized Content Service.
        return {id: input.id};
      }
    });
  }
};
```

宿主适配器必须传入来自可信认证层的 `authorize(permission, tool)` 函数：

```js
const result = await pluginManager.tools.execute('posts.lookup', {id: 123}, {
  principal: authenticatedUser,
  authorize: permission => permission === 'posts:read' && authenticatedUser.canReadPosts
});
```

未提供授权回调时执行会被拒绝。高风险操作应由上层额外实施审批、资源级授权及审计。工具的 `inputSchema` 当前仅存储为元数据，**调用方必须负责入参校验**。未来 MCP Adapter 不得把来自模型的参数当作已验证输入。插件停用时会自动注销其所有工具。

### 内置公开文章 Tools

在 worker 启动时，Firekylin 注册三个只读工具：`posts.list`、`posts.get`、`posts.search`。
三个工具都要求调用方提供 `posts:read` 授权判断，只查询公开、已发布、发布时间不晚于当前时间的文章（`type=0, status=3, is_public=1`）。

```js
const tools = global.firekylin.plugins.tools;
const results = await tools.execute('posts.search', {query: 'Node.js', limit: 10}, {
  // Example only: the real MCP adapter MUST derive permissions from verified credentials.
  authorize: permission => permission === 'posts:read',
  principal: {type: 'public'}
});
```

工具结果使用有限字段白名单；详情工具额外返回 Markdown 正文。此功能仅提供内部操作层，**不会开放新的 HTTP 路由或 MCP 端点**。后续对外暴露必须实现真实身份认证、请求参数 JSON Schema 校验、限流与审计。首版不提供任何草稿/私密文章读取能力。

### 内置管理工具（实验性）

除了只读的文章工具，worker 还注册了以下能力：

| Tool | 权限 | 附加限制 |
| --- | --- | --- |
| `posts.list_managed` | `posts:manage:read` | 与后台共用列表查询，按用户限制可见文章 |
| `posts.get_managed` | `posts:manage:read` | 与后台共用详情查询，包含草稿正文 |
| `posts.update` | `posts:write` | 更新已存在文章，需审批；编辑改动已发布文章进入审核 |
| `posts.create_draft` | `posts:write` | 当前用户创建私密草稿 |
| `posts.update_draft` | `posts:write` | 仅本人草稿 / 管理员 |
| `posts.publish` | `posts:publish` | 仅管理员 + 显式审批 |
| `posts.delete` | `posts:delete` | 本人或管理员 + 显式审批；永久删除 |
| `categories.list` | `taxonomy:read` | 查询分类 |
| `tags.list` | `taxonomy:read` | 查询标签 |
| `comments.list` | `comments:read` | 仅管理员 |
| `comments.approve` | `comments:moderate` | 仅管理员 + 显式审批，更新评论数 |
| `media.upload` | `media:write` | Base64 PNG/JPEG/GIF，最大 5 MiB，不支持远程 URL |

写入工具通过原有 Post Model 的 `getContentAndSummary` / `addPost` / `savePost` / `deletePost`，触发正常文章生命周期。当前模型入口与 Admin Controller 的部分编排仍有差异，后续可以在稳定后进一步合并 PostCommandService 与后台写入服务。

后台文章创建、更新、删除已经与 Tool 调用统一经过 `PostCommandService`；文章列表和详情经过 `PostQueryService`。评论审核通过 `CommentModerationService`，后台管理 API 和 Tool 都使用该服务，避免重复管理状态更新与评论计数同步。Tool 仍不通过内部 HTTP 调用后台路由：权限基于已认证身份传递给服务层，HTTP Controller 仅负责 Session、CSRF 和返回格式。上传与其他插件扩展的统一仍需单独验证。\n\n**重要：** `ToolRegistry.execute` 的 `authorize` 由受信任的调用方实现；高风险工具还要求额外的 `approve({name, input, principal})` 回调返回 `true`。不要把模型生成的“已批准”字段或请求体中的角色当作授权依据。Registry 不直接暴露 HTTP 接口或 MCP 服务；生产适配层必须补充 Token 认证、参数 Schema 校验、限流、审计与明确的审批交互。外部工具不得默认获得全站管理员权限。

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

默认的 `scope: 'plugin'` 会保留上述命名空间。如果插件需要提供站点级页面或与站点 URL
结构集成，可以显式使用 `scope: 'site'`：

```js
ctx.routes.register({
  method: ['GET', 'HEAD'],
  path: '/post/:pathname.md',
  scope: 'site',
  async handler({ctx: requestContext, params}) {
    const post = await think.model('post')
      .where({
        pathname: params.pathname,
        type: 0,
        status: 3,
        is_public: 1,
        create_time: {'<=': think.datetime()}
      })
      .field('markdown_content')
      .setRelation(false)
      .find();
    if (think.isEmpty(post)) return requestContext.throw(404);
    requestContext.type = 'text/markdown; charset=utf-8';
    return requestContext.method === 'HEAD' ? '' : post.markdown_content;
  }
});
```

这个路由可以通过 `/post/example.md` 直接访问。站点级路由在 Firekylin 内置路由之前
匹配，因此插件应选择明确、唯一的路径，避免覆盖后台、API、静态资源或已有页面。
插件停用时，站点级路由也会自动移除。

支持 `GET`、`HEAD`、`POST`、`PUT`、`PATCH`、`DELETE` 和 `OPTIONS`。路由选项：

- `scope: 'plugin'`：默认值，路由位于 `/api/plugins/<plugin-id>` 命名空间；
- `scope: 'site'`：注册站点级绝对路径，不添加插件命名空间；
- `auth: 'public'`：默认公开访问；
- `auth: 'admin'`：要求当前登录用户为管理员；
- `csrf: true`：修改类请求默认校验 `X-CSRF-Token`；登录后台页面可从 `window.SysConfig.csrfToken` 获取令牌（详见 [JWT 认证文档](admin-jwt.md)）；
- `csrf: false`：插件必须自行完成 Webhook 签名等安全校验。

Action handler 接收 `{ctx, params, query, body, plugin}`，返回值自动作为 HTTP 响应体。路由冲突会在注册时拒绝，插件停用时自动移除路由。

## 后台 UI 扩展

插件可以用声明式 API 增加管理员侧栏面板、页面、表单和动作。后台外观、路由、权限和
CSRF 由 Firekylin 统一管理；插件不需要绑定 React 或 Ant Design 版本，也不能向后台注入
任意脚本。此接口仅对管理员可见。

```js
register(ctx) {
  ctx.admin.registerPanel({
    id: 'reading-tools',
    title: '阅读工具',
    icon: 'setting',
    order: 80
  });

  ctx.admin.registerPage({
    id: 'overview',
    panel: 'reading-tools',
    title: '阅读统计',
    description: '查看并配置阅读统计插件',
    async load({user}) {
      return {
        notices: [{type: 'info', message: `你好，${user.name}`}],
        sections: [
          {type: 'description', title: '状态', items: [
            {label: '缓存', value: '正常'},
            {label: '文章数', value: 42}
          ]},
          {type: 'table', title: '热门文章', rowKey: 'id',
            columns: [{key: 'title', title: '标题'}, {key: 'views', title: '阅读数'}],
            rows: [{id: 1, title: 'Hello', views: 100}]},
          {type: 'grid', columns: 2, items: [
            {type: 'form', id: 'settings'},
            {type: 'markdown', title: '使用说明', content: '**保存**后新配置立即生效。'}
          ]},
          {type: 'actions', ids: ['rebuild']}
        ]
      };
    }
  });

  ctx.admin.registerForm({
    id: 'settings',
    page: 'overview',
    title: '插件设置',
    fields: [
      {name: 'enabled', type: 'switch', label: '启用统计'},
      {name: 'label', type: 'text', label: '显示名称', required: true},
      {name: 'style', type: 'select', label: '样式', options: [
        {label: '简洁', value: 'compact'}, {label: '完整', value: 'full'}
      ]}
    ],
    async load() {
      return {enabled: true, label: '阅读数', style: 'compact'};
    },
    async submit(values, {user}) {
      // 校验并保存 values；未声明的字段会被宿主丢弃。
      return {message: `已由 ${user.name} 保存`};
    }
  });

  ctx.admin.registerAction({
    id: 'rebuild',
    page: 'overview',
    label: '重建统计',
    type: 'danger',
    confirm: '确定要重建全部统计吗？',
    async handler(input, {user}) {
      return {message: `重建任务已由 ${user.name} 启动`};
    }
  });
}
```

一个面板可以包含多个页面，侧栏会自动生成二级导航。注册顺序要求为面板 → 页面 →
表单/动作；同一插件内的 ID 必须唯一。页面 `load`、表单 `load/submit` 和动作 `handler`
都会收到 `{ctx, user, pluginId}` 上下文。

`sections` 同时是页面布局：`form` 可以把已注册表单插入任意位置，`actions` 可以插入指定
动作按钮，`grid` 可以递归排列其他区块。引用必须属于当前插件的当前页面；未知类型和错误
引用会被拒绝。如果页面没有使用 `form` 或 `actions` 引用，Firekylin 会保持兼容布局：动作
显示在顶部，表单显示在内容之后。

页面支持以下安全的内容区块：

- `text`：`{type, title?, content}`；
- `description`：`{type, title?, items: [{label, value}]}`；
- `table`：`{type, title?, rowKey?, pagination?, columns: [{key, title}], rows}`；
- `stat`：统计数字卡片，支持 `prefix`、`suffix` 和 `precision`；
- `list`：标题及说明组成的列表；
- `markdown`：安全的 Markdown 子集，支持标题、列表、粗体、行内代码和链接；
- `image`、`progress`、`empty`、`divider`：图片、进度、空状态和分隔线；
- `links`：经过协议检查的链接列表；
- `code`：只读代码或日志；
- `grid`：`{type, columns?, items}`，以一至四列递归布局其他区块；
- `form`：`{type: 'form', id}`，引用当前页面的表单；
- `actions`：`{type: 'actions', ids?}`，引用部分或全部当前页面动作。

Markdown 不接受原始 HTML；链接和图片只允许站内地址及受支持的安全协议。插件不能通过页面
区块注入脚本或任意 React 组件。

表单字段支持 `text`、`textarea`、`number`、`switch`、`select`、`password`、`email`、
`url`、`radio`、`checkbox`、`color` 和 `code`。字段还可以
声明 `description`、`placeholder`、`required`；`select` 必须提供 `options`。动作的 `type`
支持 `default`、`primary` 和 `danger`。所有返回内容都作为数据由宿主渲染和转义。

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
