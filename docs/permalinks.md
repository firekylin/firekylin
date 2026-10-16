# 自定义永久链接

Firekylin 使用同一套永久链接规则生成内容 URL 和匹配前台请求。管理员可以在“设置 → 阅读设置”
中分别配置文章和独立页面的链接格式。

默认格式保持原有行为：

```text
文章：/post/{slug}.html
页面：/page/{slug}.html
```

例如，将两种格式都设置为 `/{slug}.html` 后，文章或页面 `hello` 的地址为
`/hello.html`。也可以使用日期和 ID 组织链接：

```text
/{year}/{month}/{slug}.html
/articles/{id}/{slug}
```

支持的变量包括：

| 变量 | 含义 |
| --- | --- |
| `{slug}` | 内容的路径名称 |
| `{id}` | 内容 ID |
| `{year}` | 四位发布年份 |
| `{month}` | 两位发布月份 |
| `{day}` | 两位发布日期 |

格式必须以 `/` 开头，并且至少包含 `{slug}` 或 `{id}`。`/admin`、`/api`、`/static`、
`/theme`、`/themes` 和 `/uploads` 是系统保留前缀，不能用作永久链接格式。

原有 `/post/<slug>.html` 和 `/page/<slug>.html` 路由会继续工作，因此修改格式不会立即破坏
已有外部链接。主题应使用内容 Widget 的 `permalink` 属性生成链接，避免自行拼接 `/post/`
或 `/page/`。生成 Canonical、RSS、Sitemap 和评论目标时也会使用配置后的地址。

文章和独立页面可以使用相同格式，但它们的 slug 或最终生成地址必须保持唯一。如果一个请求
同时匹配多个已发布内容，Firekylin 会返回冲突错误，避免随机展示错误内容。
