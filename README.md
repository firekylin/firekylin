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

普通用户安装参见 [普通安装](https://github.com/firekylin/firekylin/wiki/安装)，推荐使用[腾讯云实验室](https://www.qcloud.com/developer/labs/lab/10094)体验详细的安装流程。如需对 Firekylin 进行开发，可参考 [仓库版安装](https://github.com/firekylin/firekylin/wiki/仓库版安装)

## 如何使用

- [添加和管理文章](https://github.com/firekylin/firekylin/wiki/%E6%96%87%E7%AB%A0)
- [添加和管理页面](https://github.com/firekylin/firekylin/wiki/%E9%A1%B5%E9%9D%A2)
- [添加和管理推送](https://github.com/firekylin/firekylin/wiki/%E6%8E%A8%E9%80%81)
- [调整网站外观](https://github.com/firekylin/firekylin/wiki/%E4%B8%BB%E9%A2%98%E5%A4%96%E8%A7%82)
- [系统设置](https://github.com/firekylin/firekylin/wiki/%E7%B3%BB%E7%BB%9F%E8%AE%BE%E7%BD%AE)
- [如何优化博客主题](https://welefen.com/post/how-to-optimize-firekylin-theme.html)

## 常见问题

如果您在使用过程中遇到问题，请查看 [问题解答](https://github.com/firekylin/firekylin/wiki/问题解答) 中的解答，或者在 [GitHub](https://github.com/firekylin/firekylin/wiki/issues) 及 [Gitter](https://gitter.im/firekylin/firekylin?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge) 上提问。

## 用户列表

[奇舞团博客](https://75.team/) / [奇虎360-addops](https://blog.cloud.360.cn) / [十年踪迹的博客](http://h5jun.com/) / [welefen的博客](http://welefen.com/) / [大官人的博客](https://www.daguanren.cc/) /
[魔术师的帽子](https://blog.magichc7.com/)

如果你的博客也是用 FireKylin 构建的，请到 https://github.com/firekylin/firekylin/issues/34 提交网址。

## 主题分享

- https://github.com/matinjugou/firekylin-theme

## 开发者文档


- [主题开发](https://github.com/firekylin/firekylin/wiki/%E4%B8%BB%E9%A2%98%E5%BC%80%E5%8F%91)
- [贡献代码](https://github.com/firekylin/firekylin/wiki/%E8%B4%A1%E7%8C%AE%E4%BB%A3%E7%A0%81)

### 主题 Widget

Eta 主题可以按需加载数据。由于 Widget 查询是异步的，在布局中应使用 `blockAsync`：

```eta
<% await blockAsync('content', async () => { %>
<% const posts = await firekylin.widget('Widget_Contents_Post_Recent', {pageSize: 5}); %>
<% while (posts.next()) { %>
  <a href="<%= posts.permalink %>"><%= posts.title() %></a>
<% } %>
<% }) %>
```

`title()` 返回格式化后的标题，`title.val()` 返回数据库中的原始标题。内容 Widget 还提供
`date()`、`excerpt()`、`commentsNum()`、`permalink` 和 `url`；标签 Widget 提供 Typecho
兼容的 `split()` 分档方法。

内置 Widget 包括负责首页、文章、页面、归档和搜索的 `Widget_Archive`，以及
`Widget_Contents_Post_Recent`、`Widget_Metas_Tag_Cloud` 和 `Widget_Metas_Category_List`。
应用或插件也可以继承 `firekylin.Widget`，并通过
`firekylin.registerWidget(name, WidgetClass)` 注册自定义 Widget。应用内置 Widget 统一由
`src/home/widget/index.js` 的 Widget map 导出，并在 Worker 启动时自动注册。实现文件按照
Widget 名称逐段存放，例如 `Widget_Contents_Post_Recent` 对应 `contents/post/recent.js`。

Widget 使用与 Typecho 一致的请求级对象池：同一次请求中，相同完整名称只执行一次，后续调用会
复用第一次调用创建的实例和参数。如需同一 Widget 使用另一组参数，请指定别名：

```eta
<% const latest = await firekylin.widget('Widget_Contents_Post_Recent', {pageSize: 5}); %>
<% const sidebar = await firekylin.widget('Widget_Contents_Post_Recent@sidebar', {pageSize: 10}); %>
```

`firekylin.widget.destroy(name)` 可以移除指定名称（包括别名）的缓存，省略 `name` 则清空本次
请求的全部 Widget 缓存。下一次调用被移除的名称时会重新执行 `init()` 和 `execute()`。

## 捐赠支持

你的每一份帮助都将使 Firekylin 做的更好，走的更远！我们一直在坚持不懈地努力，并坚持让 Firekylin 完全开源免费，你的帮助将使我们更有动力和信心！

欢迎使用支付宝或者微信扫描二维码进行捐赠！已捐赠用户将在 [捐赠列表](https://github.com/firekylin/firekylin/wiki/捐赠列表) 中列出。同时也欢迎进入 [Firekylin 周边店铺](https://weidian.com/?userid=1233141030) 购买周边支持我们的项目！

<div class="donate-qrcode">
<img width="300" src="https://p5.ssl.qhimg.com/t013f422b5b319becbb.png" alt="donate by alipay" /> <img width="300" src="https://p4.ssl.qhimg.com/t0142965a40989b8d7a.png" alt="donate by wechat" />
</div>

[![Powered by DartNode](https://dartnode.com/branding/DN-Open-Source-sm.png)](https://dartnode.com "Powered by DartNode - Free VPS for Open Source")
