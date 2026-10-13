# 主题 / 插件开发者

优先在站点项目里扩展，使用核心提供的 Widget、插件和共享服务。修改 node_modules 会在升级时丢失；有意修改核心应走维护者的源码开发流程。

## 目录和开发模式

| 对象 | 独立项目 | 核心源码 / 旧部署 |
| --- | --- | --- |
| 配置 | `firekylin.config.js`，保留 database/server 原值 | ThinkJS `src/config/`，本地数据库配置 `src/config/db.js` |
| 主题 | `themes/<theme>/` | `www/theme/<theme>/` |
| 本地插件 | 默认 `plugins/<id>/`，可配置 pluginsPath | 以 getContext().projectPath 为根目录，先核对部署 |
| 自定义 Widget | 项目 widgets 数组指定的入口，或活动主题入口 | 通过同一注册机制，避免改内置类 |
| 数据和上传 | `data/`、`uploads/` | `runtime/`、`logs/`、`www/static/upload/` 等 |

独立项目的 `npm run dev` 是 `firekylin -D` 后端开发模式。核心仓库的 `pnpm dev` 是 Vite 前端服务器（默认 3000，代理 `/admin/api` 到 8360），后端用 `pnpm start`。不要把这两种 dev 命令混用。

## 主题结构和页面

主题包含 package.json、Eta 模板和静态资源。先复制/检查现有活动主题，避免覆盖用户自定义版本。常用模板：

| 文件 | 用途 |
| --- | --- |
| `layout.eta` | 共用布局、导航、资源和 blocks |
| `index.eta` | 首页、分类/标签/作者列表 |
| `post.eta` / `page.eta` | 文章和独立页面 |
| `archive.eta` / `search.eta` | 归档和搜索 |
| `cate.eta` / `tag.eta` | 分类、标签入口 |
| `inc/` | 通过 include 复用的片段 |
| `template/*.eta` | 后台可选择的自定义页面模板 |
| `error/404.html`、`error/500.html` | ThinkJS trace 按 HTTP 状态发现的错误模板，保留这些文件名 |
| `res/` | CSS、JS、图标等主题资源 |

核心页面模板是 Eta；不要生成旧 EJS/Nunjucks 语法或将模板文件一律改成 .html。`<% ... %>` 执行模板逻辑，`<%= ... %>` 转义输出，`<%~ ... %>` 原样输出受信任 HTML。布局使用 `layout('./layout')` 和 `block(...)`，片段使用 `include(...)`，具体以当前 view adapter 与默认主题为准。

### 最小最近文章示例

```eta
<% const site = await firekylin.widget('Widget_Options'); %>
<% const posts = await firekylin.widget('Widget_Contents_Post_Recent', {pageSize: 5}); %>
<h1><%= site.title() %></h1>
<ul>
<% while (posts.next()) { %>
  <li><a href="<%= posts.permalink %>"><%= posts.title() %></a></li>
<% } %>
</ul>
```

`permalink` / `url` 是字符串属性，**不是 `url()` 方法**。`title` / `content` 是 FieldAccessor，可用 `title()` / `content()`，支持 `.val()`；不要把旧文档里的错误方法名照搬到新主题。Widget 使用游标 `next()` 更新当前 row；需要多次遍历时使用不同别名或保存 `toArray()` 结果，避免重复消费同一实例。

### 内置 Widget

| 名称 | 参数 | 主要数据 / 行为 |
| --- | --- | --- |
| `Widget_Options` | `{}` | title、description、keywords、navigation、themeConfig、siteUrl、themeUrl(path) |
| `Widget_Archive` | `type`: index/post/page/archive/search | 当前路由对应内容、pagination、archiveTitle/Slug、grouped、keyword、pageUrl(page)、is(type) |
| `Widget_Contents_Post_Recent` | `pageSize` | 近期公开文章；不是 `limit` 参数 |
| `Widget_Metas_Category_List` | `{}` | 分类列表及 Meta 数据 |
| `Widget_Metas_Tag_Cloud` | sort、desc、limit、ignoreZeroCount | 标签云；sort 为 name/pathname/count/update_time，split(...sizes) 计算字体级别 |

ContentsWidget 还提供 `date(format)`、`excerpt(length,trim)`、`commentsNum(...formats)`、`category(split,link,defaultValue)`、`tags(split,link,defaultValue)`、`author(item)` 和 `allow(...permissions)`。读取上下文时优先用这些能力，不在模板中复制一套 SQL 权限逻辑。

使用 `site.themeUrl('res/css/all.css')` 构造资源 URL，兼容独立项目 `/themes/` 和旧部署 `/theme/`。不要把整个 options 对象序列化到前端；主题只输出所需公开字段。

文章详情可输出已有 Markdown 渲染 HTML 和评论：

```eta
<% const post = await firekylin.widget('Widget_Archive', {type: 'post'}); %>
<% if (post.next()) { %>
<article>
  <h1><%= post.title() %></h1>
  <div class="content"><%~ post.content() %></div>
</article>
<%~ firekylin.comment({className: 'article-comments', title: '评论'}) %>
<% } %>
```

`firekylin.comment()` 根据当前内容的 allow_comment 和站点设置生成 Waline 客户端。可指定 className、title、loadingText、resourceURL；自建资源目录应提供 waline.js/waline.css。主题无需再初始化第二个评论实例。测试关闭评论、强制登录和不同语言的显示。

### 主题可配置项

package.json 的 `configElements` 声明后台配置表单，参考活动主题中已经支持的 text/color/css/javascript/html 类型。值由 `Widget_Options.themeConfig` 读取。确认控件实现后再增加类型，不假设任意 JSON Schema 都会自动变成配置表单。自动克隆主题的后台接口已废弃，需要在文件系统复制并更改主题标识。

## 自定义 Widget 和类型提示

项目内运行：

```sh
npx --no-install firekylin plugin recent-posts
```

这个命令生成的是 **Widget 脚手架**，并把入口加入项目配置 widgets 数组，不是自动生成完整的事件/路由 npm 插件。入口导出同步初始化函数，返回“名称 → 类”的映射：

```js
module.exports = ({ContentsWidget}) => ({
  Widget_Custom_Recent: class extends ContentsWidget {
    async execute() {
      const requested = Number(this.parameter.pageSize) || 5;
      const pageSize = Math.min(Math.max(requested, 1), 20);
      const result = await this.model('post').getPostList(1, {pageSize});
      this.pushAll(result.data || []);
    }
  }
});
```

对公开 Widget，使用 getPostList 等已有可见性过滤；裸 `.select()` 不会自动排除草稿/私密内容。通过 `[...existingWidgets, './widgets/entry.js']` 合并项目配置，不能覆盖原来的 database、server 或其他入口。

活动主题可在 package.json 中声明 `firekylin.widgets`。名称冲突默认失败；需要覆盖时显式声明 widgetOverrides。活动主题不能覆盖 `Widget_Options`。修改服务端 Widget 后重启 worker，不靠浏览器刷新替代。

`Widget_Custom_Recent@sidebar` 这样的别名有独立实例缓存；不要把缓存标签当成数据库查询参数。`firekylin.widget.destroy(name?)` 用于清理对应实例缓存。

站点根目录 `firekylin.d.ts` 引用 `/// <reference types="firekylin" />`。自定义 Widget 可以通过声明合并扩展 Firekylin.WidgetRegistry；参数和实例签名必须对应实际类。完整定义在 `types/index.d.ts`，类型补全不会替代运行时注册。

## 完整插件的安装和生命周期

本地插件入口为 CommonJS，目录例子 `plugins/example/`：

```json
{
  "name": "firekylin-plugin-example",
  "version": "1.0.0",
  "main": "plugin.js",
  "engines": {"firekylin": ">=2.8.0"},
  "firekylin": {"type": "plugin", "id": "example", "entry": "plugin.js"}
}
```

engine 是版本约束，不保证某个尚未发布的 master 功能已存在；发布插件前核对兼容实现。

启动时扫描 pluginsPath 目录，以及项目 dependencies/optionalDependencies 中标记 `firekylin.type: plugin` 的直接 npm 依赖。普通依赖、devDependencies 不会因这里的发现规则自动成为插件。校验 manifest → register(ctx) → 可选 activate(ctx)。

ctx 包括 id、manifest、root、events、routes、templates、tools、widgets、logger、config。config 来自项目 `pluginConfig[pluginId]`。停用自动清理已登记的 events/routes/templates/widgets/tools；插件自身的定时器、连接和外部资源仍需 deactivate 清理。

没有已实现的通用后台插件启停 UI、配置即强制禁用机制或依赖拓扑保证。需要这些行为时检查 manager 的实际实现；不要发明插件管理 API。metadata.permissions 是声明，不是 Node.js 运行沙箱。

## 事件与内容过滤

| 通知型事件 | 常用 payload |
| --- | --- |
| app.ready | version |
| plugin.activated / plugin.deactivated | pluginId |
| user.created | user |
| post.created / post.updated | post，更新时带 result |
| post.beforeDelete / post.deleted | id，删除后带 result |
| page.created / page.updated | page |
| content.created / content.updated | post、type（具体是否提供以发出点为准） |
| archive.beforeQuery / archive.index / archive.search | controller、type 或 keyword |
| theme.beforeRender / theme.afterRender | controller、name、theme、response 等 |

| 过滤型事件 | 输入与作用 |
| --- | --- |
| user.beforeCreate | 用户创建数据 |
| content.beforeCreate / content.beforeUpdate | 内容写入数据 |
| content.markdown | 渲染前 Markdown |
| content.html | 生成的正文 HTML |
| content.excerpt | 生成的摘要 |
| content.render | 正文或摘要 HTML；context.type 区分 content/summary |

通知 handler 不通过返回值改原对象；过滤 handler 返回新值，undefined 表示保留上一个值。`priority` 默认 100，较小值先执行；`ctx.events.on` 返回取消函数。默认记录/隔离异常，不保证监听器失败会回滚数据库。

```js
module.exports = {
  register(ctx) {
    ctx.events.on('post.created', ({post}) => {
      ctx.logger.info(`example: post created ${post.id}`);
    }, {priority: 100});
    ctx.events.on('content.excerpt', (html, context) => {
      return context.post ? html : undefined;
    });
  }
};
```

外部通知、同步等副作用只在用户明确要求时启用。设置超时和幂等性，不在 post.created 重复创建同一文章。当前插件 API 没有专用评论 Hook、Feed 或 XML-RPC Hook；不要根据功能名字臆造事件。

## 插件路由

```js
module.exports = {
  register(ctx) {
    ctx.routes.register({
      method: 'POST', path: '/refresh/:id', auth: 'admin', csrf: true,
      async handler({params, ctx: request}) {
        return {id: params.id, path: request.path};
      }
    });
  }
};
```

默认地址为 `/api/plugins/example/refresh/<id>`。scope: site 提供绝对站点路径，可以影响原有页面，所以先确认没有覆盖内置路由、静态资源或后台。支持 GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS，method 可为数组，handler 收到 ctx/params/query/body/plugin，返回值作为响应体。

默认 auth 是 public，默认 csrf 是 true。管理员写操作显式使用 auth: admin 和 csrf: true，提交 `X-CSRF-Token`（后台提供 window.SysConfig.csrfToken）。公开 webhook 需要自行校验签名、重放和权限，不能仅设 csrf:false 就认为已安全。

插件路由在 payload/router 中间件之前执行，不能假设 ctx.request.body 已解析。普通路由应受限读取实际请求流；协议桥接可使用有边界的 raw body reader。路由重复会拒绝，动态匹配的先后和 site scope 冲突也需要测试。

## 模板函数、过滤器和 Slots

```js
module.exports = {
  register(ctx) {
    ctx.templates.registerFunction('example.badge', ({count}) => `${Number(count) || 0} 次阅读`);
    ctx.templates.registerFilter('example.compact', value => String(Number(value) || 0));
    ctx.templates.registerSlot('post.after', () => '<aside>推荐阅读</aside>');
  }
};
```

```eta
<%= await plugin.example.badge({count: 5}) %>
<%= await filters['example.compact'](5) %>
<%~ await slots.render('post.after') %>
```

函数注册名按点号拆为 plugin 对象；模板函数和过滤器支持 Promise，Slot 需要主题显式调用才显示。只有可信的 Slot HTML 使用原样输出。registerPartial 在 Registry 层存在，但当前默认模板上下文没有公开一个对应的 partial 调用接口；不要编造 `partials.render()`。

## 扩展 AI Tools

工具名只能包含小写分段，如 `example.lookup`；不能使用 createDraft 之类的大写分段。不要占用内置工具名或使用 core:content/core:management/core:media 作为插件 ID。

```js
module.exports = {
  register(ctx) {
    ctx.tools.register({
      name: 'example.lookup', description: '返回调用者给出的有效文章 ID',
      requiredPermissions: ['posts:read'],
      inputSchema: {type: 'object', additionalProperties: false,
        properties: {id: {type: 'integer', minimum: 1}}, required: ['id']},
      execute(input) {
        if (!input || !Number.isSafeInteger(input.id) || input.id < 1) throw new TypeError('Invalid ID');
        return {id: input.id};
      }
    });
  }
};
```

此例只演示注册，不读取文章。真正读取/写入时复用 PostQueryService/PostCommandService 等业务服务并检查 principal、角色与资源归属；不能把 requiredPermissions 当成完整的资源级授权。

Registry 的调用者必须提供可信 authorize；requiresApproval 工具还需要可信 approve 回调。Registry 只存 schema，MCP SDK 才对远程请求校验 schema，所以内部直接执行仍需验证输入。当前 OAuth 允许的 scopes 是固定集合：自定义 `example:read` 不会自动成为可授予 scope，需要有意扩展授权服务器和对应测试。

## 验证和交付

主题检查首页、文章、页面、搜索、分类/标签、归档、分页、404/500、移动端、资源 URL、评论以及私密内容不可见性。插件检查重复注册、加载异常、停用清理、鉴权/CSRF、参数校验、事件幂等和外部失败。

使用核心 test:widget、test:plugin、test:types 和必要的渲染/HTTP 回归；前端改动运行 build。只将启动日志或截图作为补充证据，不能替代功能请求。交付目录、入口配置、模板调用方式、兼容版本与测试结果。
