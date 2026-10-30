# Widget 与主题模板扩展

在 Firekylin 项目目录中可以用 CLI 快速创建并登记一个 Widget 插件：

```sh
npx --no-install firekylin plugin recent-posts
```

命令会生成 `plugins/recent-posts/`（包含实现、类型声明和使用说明），并把入口写入 `firekylin.config.js` 的 `widgets` 数组。插件名使用字母、数字和连字符；生成后重启 worker 即可加载。

项目可以在 `firekylin.config.js` 中声明 Widget 入口。入口相对项目根目录解析，并在 worker 启动时加载：

```js
module.exports = {
  database: {/* ... */},
  widgets: ['./widgets/index.js']
};
```

入口导出一个同步初始化函数。函数会收到稳定的 `Widget`、`ContentsWidget` 和 `MetasWidget` 基类，并返回“名称 → Widget 类”的映射。内容类 Widget 推荐继承 `ContentsWidget`，以复用 permalink、摘要、分类标签和作者等处理。基类本身不会过滤查询结果；下面使用与内置近期文章 Widget 相同的 `getPostList`，排除草稿、私密文章和未来发布文章，并隐藏密码保护内容：

```js
module.exports = ({ContentsWidget}) => ({
  Widget_Custom_Posts: class extends ContentsWidget {
    async execute() {
      const requested = Number(this.parameter.limit);
      const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.floor(requested), 1), 20) : 5;
      const result = await this.model('post').getPostList(1, {pageSize: limit});
      this.pushAll(result.data || []);
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

Widget 重名默认会阻止启动或渲染，并同时报告两个来源。不要直接使用不带可见性过滤的 `post.select()` 向公开页面提供数据。需要替换已有 Widget 时，必须在项目配置或主题的 `firekylin` 配置中通过 `widgetOverrides` 显式列出名称。主题不能覆盖用于确定当前主题的 `Widget_Options`。扩展代码运行在 Firekylin 服务端进程中，应只安装可信扩展；修改后需重启 worker。

## 模板评论区

文章或页面模板可以通过一行输出内置评论区：

```eta
<%~ firekylin.comment() %>
```

`comment()` 只为允许评论的公开、已发布内容输出评论区，预览模式不输出，同一请求不会重复渲染，并读取后台的分页、语言及强制登录设置。主题无需自行引入评论客户端或编写初始化脚本。可选参数包括 `className`、`title`、`loadingText` 和 Waline `dist` 目录地址 `resourceURL`：

```eta
<%~ firekylin.comment({className: 'article-comments', title: '评论'}) %>
```

如需升级 Waline 客户端或使用自建 CDN，可以指定资源目录，先在该目录部署兼容的 Waline 客户端文件；Firekylin 会在其下加载 `waline.js` 和 `waline.css`：

```eta
<%~ firekylin.comment({resourceURL: '/assets/waline/dist'}) %>
```

## 编辑器类型提示

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
    // 在此声明自定义实例方法；实现需由对应的 JavaScript 类提供。
  }

  interface WidgetRegistry {
    Widget_Custom_Posts: WidgetDefinition<CustomPostsParameters, CustomPostsWidget>;
  }
}
```

之后调用 `firekylin.widget('Widget_Custom_Posts', {limit: 8})` 时，参数和返回实例都会按扩展声明进行推导。带缓存标识的名称（如 `Widget_Custom_Posts@sidebar`）也会使用同一份 Widget 类型。

此脚手架注册项目 Widget，不是带有 `register(ctx)` 生命周期的完整插件。完整插件的事件、路由和 Widget 注册见 [插件开发指南](plugins.md)，文章编辑字段见 [主题文章字段](theme-fields.md)。评论后台设置见 [评论与验证码](comments.md)。
