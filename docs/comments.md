# 评论与验证码

主题接入和自定义客户端资源见 [模板评论区](widgets.md#模板评论区)。评论管理的基本操作见 [Wiki 评论](https://github.com/firekylin/firekylin/wiki/评论)。

## 社交登录

评论支持 Waline OAuth 社交登录；可用身份提供方以认证服务实际配置为准。默认服务为 `https://oauth.lithub.cc`，自部署时通过 `OAUTH_URL` 指向 [Waline Auth](https://github.com/walinejs/auth)。首次社交登录创建评论者账号；已有后台用户可在自己的用户编辑页绑定或解绑社交账号，管理员可查看绑定情况。评论者账号不具有作者或管理员权限。

## 验证码

系统设置 → 验证码设置支持 Turnstile 和 reCAPTCHA v3。填写 Site Key 与私钥，勾选登录、评论生效区域；配置独立保存在 captcha 选项中。私钥在管理员后台直接保存和回填；公开页面不下发私钥。生效区域默认勾选登录与评论。登录支持语言、Turnstile 主题及验证前隐藏提交按钮。评论仅传入 Waline 客户端原生 site key，由其渲染挑战；评论服务调用注入的验证码服务完成校验。reCAPTCHA v3 要求评分至少 0.5，登录 action 为 `login`，评论 action 为 `social`。第三方 OAuth 与域单点登录使用身份提供方认证。

## 评论邮件通知

在后台「评论设置」开启邮件通知，填写 SMTP 服务器、端口、用户名、密码、发件人及站长收件邮箱。465 端口开启直接 TLS；587/STARTTLS 关闭直接 TLS。SMTP 密码不回显，留空保存保留原值。

新评论通知站长，已审核回复通知被回复者；自回复不发送给本人。待审核回复在通过审核后发送，投递失败不影响评论保存。此功能不包含账号验证或密码找回邮件。未填写项兼容 SMTP_HOST、SMTP_PORT、SMTP_SECURE、SMTP_USER、SMTP_PASS、SMTP_FROM、AUTHOR_EMAIL 环境变量。

评论设置按基本设置、展示与交互、邮件通知、安全与用户分为四个标签页，每页独立保存，保留其他页的配置。邮件通知页可填写测试收件邮箱，用当前未保存的 SMTP 参数发送测试邮件；密码留空时复用已保存密码。发送结果直接显示在页面，失败时展示经过密码隐藏的 SMTP 错误，便于检查连接、认证和收件人问题。

邮件通知页支持自定义标题和纯文本正文模板，留空恢复默认。使用 `{{siteName}}`、`{{siteUrl}}`、`{{type}}`、`{{nick}}`、`{{comment}}`、`{{url}}`、`{{parentNick}}`、`{{parentComment}}`、`{{recipient}}`、`{{status}}` 插入通知数据。模板只做文本变量替换，不执行代码。发送测试邮件时会使用当前模板和示例评论数据，便于确认效果。
