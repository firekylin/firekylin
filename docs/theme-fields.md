# 主题文章字段

主题可以在 `package.json` 中通过 `themeFields` 声明文章编辑字段。字段会同时显示在文章和页面编辑器的“主题字段”区域。

```json
{
  "name": "my-theme",
  "version": "1.0.0",
  "themeFields": [
    {
      "name": "subtitle",
      "type": "text",
      "label": "副标题",
      "help": "显示在文章标题下方"
    },
    {
      "name": "layout",
      "type": "select",
      "label": "内容布局",
      "default": "normal",
      "options": [
        {"value": "normal", "label": "普通"},
        {"value": "wide", "label": "宽屏"}
      ]
    },
    {
      "name": "features",
      "type": "checkbox",
      "label": "附加内容",
      "options": ["toc", "copyright"]
    }
  ]
}
```

支持的字段类型为 `text`、`url`、`email`、`password`、`textarea`、`select`、`radio` 和 `checkbox`。所有字段都支持 `name`、`label`、`help` 和 `default`；选择类字段通过 `options` 提供选项，选项既可以是字符串，也可以是带有 `value`、`label` 的对象。

字段值保存在文章的 `options.fields` 中。在 Eta 主题模板中，可以通过文章 Widget 的 `fields` 读取：

```eta
<% if (post.fields.subtitle) { %>
  <p class="subtitle"><%= post.fields.subtitle %></p>
<% } %>
```

旧文章或未配置字段的文章会得到空对象，不需要额外做兼容处理。
