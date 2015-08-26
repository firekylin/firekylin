/*
 Navicat Premium Data Transfer

 Source Server         : jedm.cn
 Source Server Type    : MySQL
 Source Server Version : 50535
 Source Host           : jedm.cn
 Source Database       : firekylin

 Target Server Type    : MySQL
 Target Server Version : 50535
 File Encoding         : utf-8

 Date: 08/25/2015 15:55:45 PM
*/

SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `fk_category`
-- ----------------------------
DROP TABLE IF EXISTS `fk_category`;
CREATE TABLE `fk_category` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

-- ----------------------------
--  Records of `fk_category`
-- ----------------------------
BEGIN;
INSERT INTO `fk_category` VALUES ('13', 'QHPASS文档'), ('14', '功能模块'), ('17', 'wwww'), ('20', '未分类'), ('24', 'aaa ');
COMMIT;

-- ----------------------------
--  Table structure for `fk_config`
-- ----------------------------
DROP TABLE IF EXISTS `fk_config`;
CREATE TABLE `fk_config` (
  `key` char(20) NOT NULL,
  `value` text,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

-- ----------------------------
--  Records of `fk_config`
-- ----------------------------
BEGIN;
INSERT INTO `fk_config` VALUES ('author', 'haha'), ('discuss_commoncode', '<script type=\"text/javascript\">\nvar duoshuoQuery = {short_name:\"firekylin\"};\n	(function() {\n		var ds = document.createElement(\'script\');\n		ds.type = \'text/javascript\';ds.async = true;\n		ds.src = (document.location.protocol == \'https:\' ? \'https:\' : \'http:\') + \'//static.duoshuo.com/embed.js\';\n		ds.charset = \'UTF-8\';\n		(document.getElementsByTagName(\'head\')[0] \n		 || document.getElementsByTagName(\'body\')[0]).appendChild(ds);\n	})();\n	</script>'), ('discuss_numbercode', '<span class=\"ds-thread-count\" data-thread-key=\"$$id$$\" data-count-type=\"comments\">加载中</span>'), ('discuss_on', 'true'), ('discuss_pagecode', '<div class=\"ds-thread\" data-thread-key=\"$$id$$\" data-title=\"$$title$$\" data-url=\"$$url$$\"></div>'), ('post_showurl', 'true'), ('rss_excerpt', 'false'), ('rss_number', '10'), ('rss_on', 'true'), ('share_number', 'true'), ('share_on', 'true'), ('share_other', 'false'), ('share_size', 'jiathis_style_24x24'), ('share_to_facebook', 'true'), ('share_to_twitter', 'true'), ('share_to_weibo', 'true'), ('share_to_weixin', 'true'), ('sns_email', 'firekylin@jedm.cn'), ('sns_facebook', 'jedmeng'), ('subtitle', '吃葡萄不吐葡萄皮'), ('title', '演示博客'), ('url', 'http://firekylin.jedm.cn:6789/');
COMMIT;

-- ----------------------------
--  Table structure for `fk_post`
-- ----------------------------
DROP TABLE IF EXISTS `fk_post`;
CREATE TABLE `fk_post` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `date` datetime NOT NULL,
  `modify_date` datetime DEFAULT NULL,
  `modify_user_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

-- ----------------------------
--  Records of `fk_post`
-- ----------------------------
BEGIN;
INSERT INTO `fk_post` VALUES ('165', '0', '0', 'QUC JS SDK 文档', '### 概述\nQUC, Qihoo User Center, 即360通行证帐号。\nJS SDK 从前端提供了登录、注册、退出、获取用户信息、设置用户名等众多接口，方便360旗下网站进行ID化相关的开发工作。\n\n点击[这里](#start.md)开始愉快的开发旅程。\n\n### 理念\n以下理念贯穿了V5版的整个开发过程：\n`杜绝潜规则`、`快速上手`、`简单易用`但又`配置丰富`、`易于定制`\n\n### 当前最新版本\n5.0.2\n\n### 地址\n线上版：\n`http://js.passport.qihucdn.com/{version} [/{module}] [/{file}].js`\n开发版：\n`http://jssdk.passport.corp.qihoo.net/{version} [/{module}] [/{file}].js`\n*开发版代码未压缩，且提供了错误提示、环境检测等功能，仅能在公司内网访问*\n*推荐使用开发版进行开发，完成后只需**修改域名**就可快速替换为线上版本*\n\n{version} 为版本号\n{module} [可选, 默认为full] 为加载的模块，暂时只提供全量包(full)\n{file} [可选, 默认为combo] 为加载的文件，为js时只加载js文件，为css时只加载css文件，为combo时加载两者\n\n地址示例：\n加载全量包（以下三者等同）\nhttp://js.passport.qihucdn.com/5.0.2.js\nhttp://js.passport.qihucdn.com/5.0.2/full.js\nhttp://js.passport.qihucdn.com/5.0.2/full/combo.js\n\n加载全量包css\nhttp://js.passport.qihucdn.com/5.0.2/full/css.js\n\n加载全量包js\nhttp://js.passport.qihucdn.com/5.0.2/full/js.js\n\n### 依赖\njQuery 1.8及以上版本\n\n### v3到v5升级指导\n[点击这里](#upgradeguide.md)\n\n### 已经接入的业务\n[安全服务中心](http://fuwu.360.cn)、[反诈骗联盟](http://fanzhapian.360.cn)、[360会员专题页](http://vip.360.cn/huodong/postcard.html)、[360网站监控](http://jk.cloud.360.cn)\n\n### 升级日志\n- 5.0.2Beta\n统一邮箱激活策略，设置邮箱接口增加回调功能\n增加和邮箱相关的状态方法\n增加浮层标题自定义配置\n引入插件系统\nbug 修复\n- 5.0.1Alpha\n第一版\n\n### 联系我们\n前端组件相关问题：[孟之杰](mailto:mengzhijie@360.cn?subject=QUC%20JS%20SDK咨询&cc=maoshuai@360.cn) [毛帅](mailto:maoshuai@360.cn?subject=QUC%20JS%20SDK咨询&cc=mengzhijie@360.cn)\n后端部署问题：[于富龙](mailto:yufulong@360.cn?subject=QUC%20JS%20SDK咨询&cc=mengzhijie@360.cn&cc=maoshuai@360.cn)\n产品相关问题：[刘菲](mailto:liufei@360.cn?subject=QUC%20JS%20SDK咨询&cc=mengzhijie@360.cn&cc=maoshuai@360.cn)\n申请业务标识：[参考这里](#srcname.md)', '2015-08-06 15:49:19', '2015-08-06 16:10:20', null), ('166', '0', '13', 'Markdown 简明指南', '## 什么是 Markdown\n\nMarkdown 是一种轻量级标记语言，创始人为约翰·格鲁伯（John Gruber）和亚伦·斯沃茨（Aaron Swartz）。它允许人们“使用易读易写的纯文本格式编写文档，然后转换成有效的XHTML(或者HTML)文档”。这种语言吸收了很多在电子邮件中已有的纯文本标记的特性。\n\n简而言之，Markdown 至少有以下优点：\n\n* 纯文本，所以兼容性极强，可以用所有文本编辑器打开。\n* 让你专注于文字而不是排版。\n* 格式转换方便，Markdown 的文本你可以轻松转换为 html、电子书等。\n* Markdown 的标记语法有极好的可读性。\n\nMarkdown 语法比较灵活，本文只挑选最常用的写法来介绍。完整文档请前往 [Markdown 官网](http://daringfireball.net/projects/markdown/syntax)查看。\n\n## 一、标题\n\n在 Markdown 中，你只需要在文本前面加上 # 即可，同理、你还可以增加二级标题、三级标题、四级标题、五级标题和六级标题，总共六级，只需要增加  # 即可，标题字号相应降低。例如：\n\n```\n# 一级标题\n## 二级标题\n### 三级标题\n#### 四级标题\n##### 五级标题\n###### 六级标题\n```\n\n注：# 和「一级标题」之间建议保留一个字符的空格，这是最标准的 Markdown 写法。\n\n上面的例子最终效果是这样的：\n\n# 一级标题\n## 二级标题\n### 三级标题\n#### 四级标题\n##### 五级标题\n###### 六级标题\n\n## 二、列表\n\n列表格式也很常用，在 Markdown 中，你只需要在文字前面加上 - 就可以了，例如：\n\n```\n- 文本1\n- 文本2\n- 文本3\n```\n\n如果你希望有序列表，也可以在文字前面加上 1. 就可以了，例如：\n\n```\n1. 文本1\n1. 文本2\n1. 文本3\n```\n\n注：-、1.和文本之间要保留一个字符的空格。\n\n上面的例子最终效果是这样的：\n\n- 文本1\n- 文本2\n- 文本3\n\n1. 文本1\n1. 文本2\n1. 文本3\n\n## 三、链接和图片\n\n在 Markdown 中，插入链接只需要使用 `[链接文本](链接地址 \"链接title\")` 这样的语法即可（title 可省略），例如：\n\n```\n[360导航](http://hao.360.cn \"这是个链接\")\n```\n\n在 Markdown 中，插入图片只需要使用 `![图片alt](图片链接地址 \"图片title\")` 这样的语法即可（title 可省略），例如：\n\n```\n![360导航](http://p1.qhimg.com/t01a21cb7d399f87a40.png)\n```\n\n注：插入图片的语法和链接的语法很像，只是前面多了一个 ！。\n\n如果要给图片加链接，也很简单。把`链接`语法中的`链接文本`替换为图片语法就可以了。\n\n```\n[![360导航](http://p1.qhimg.com/t01a21cb7d399f87a40.png)](http://hao.360.cn \"这是个链接\")\n```\n\n上面的例子最终效果是这样的：\n\n[360导航](http://hao.360.cn \"这是个链接\")\n![360导航](http://p1.qhimg.com/t01a21cb7d399f87a40.png)\n[![360导航](http://p1.qhimg.com/t01a21cb7d399f87a40.png)](http://hao.360.cn \"这是个链接\")\n\n## 四、引用\n\n在 Markdown 中，你只需要在你希望引用的文字前面加上 > 就好了，例如：\n\n```\n> 这是一段引用的文字哦。\n```\n\n注：> 和文本之间要保留一个字符的空格。\n\n上面的例子最终效果是这样的：\n\n> 这是一段引用的文字哦。\n\n`>`也可以跟其它语法结合使用，例如：\n\n```\n> ### 标题2\n> - 列表1\n> - 列表2\n\n```\n\n解析后是这样的：\n\n> ### 标题2\n> - 列表1\n> - 列表2\n\n## 五、粗体和斜体\n\nMarkdown 的粗体和斜体也非常简单，用两个 `*` 包含一段文本就是粗体的语法，用一个 `*`包含一段文本就是斜体的语法。例如：\n\n```\n我们都是*程序员*，我们来自**奇舞团**。\n```\n\n解析是后这样的（一个和两个`*`分别被解析为：`em`和`strong`）：\n\n我们都是*程序员*，我们来自**奇舞团**。\n\n## 六、代码\n\n简单的代码，如参数、方法等关键字，可以使用 ` `` `定义，如：\n\n```\n`Cookie`类有`set`和`set`两个方法。\n```\n\n解析后是这样的：\n\n`Cookie`类有`set`和`set`两个方法。\n\n成段的代码，可以使用下面的方法定义，如：\n\n	```\n	<script>\n		alert(\'hello world!\');\n	</script>\n	```\n\n另外，还可以用下面这种写法指定代码语言，目前支持 `html`，`js`，`css` 这几种。\n\n	```html\n	<script>\n		alert(\'hello world!\');\n	</script>\n	```\n\n解析后是这样的：\n\n```html\n<script>\n	alert(\'hello world!\');\n</script>\n```\n\n对于可执行代码，可以在js或html后添加`:run`，例如：\n	```js:run\n		alert(\'hello world\');\n	```\n	```html:run\n		<body>\n			hello world\n		</body>\n	```\n这样这段代码可以执行\n\n解析后是这样的：\n```js:run\n	alert(\'hello world\');\n```\n```html:run\n	<body>\n		hello world\n	</body>\n```\n\n## 七、表格\n\n这是一个表格的 Markdown 语法：\n\n```\n| 表头1 | 表头2 | 表头3 |\n| ---- | ---- | ---- |\n| 1    | 2    | 3    |\n| 1111 | 2222 | 3333 |\n```\n\n显示效果为：\n\n| 表头1 | 表头2 | 表头3 |\n| ---- | ---- | ---- |\n| 1    | 2    | 3    |\n| 1111 | 2222 | 3333 |\n\n如果要控制表格某一列的对齐方式，也很简单（请留意第二行的英文冒号）：\n\n```\n| 左对齐（默认） | 居中对齐 | 右对齐 |\n| :----------  | :-----: | ----: |\n| 1            | 2       | 3     |\n| 1111         | 2222    | 3333  |\n```\n\n显示效果为：\n\n| 左对齐（默认） | 居中对齐 | 右对齐 |\n| :----------  | :-----: | ----: |\n| 1            | 2       | 3     |\n| 1111         | 2222    | 3333  |\n\n表格当然也可以跟其它语法结合使用，如：\n\n```\n| 表头1 | 表头2 | 表头3 |\n| ---- | ---- | ---: |\n| 1    | 2    | 3    |\n| `code` | *我变斜了* | **我是加粗的** |\n```\n\n显示效果为：\n\n| 表头1 | 表头2 | 表头3 |\n| ---- | ---- | ---: |\n| 1    | 2    | 3    |\n| `code` | *我变斜了* | **我是加粗的** |\n', '2015-08-06 15:49:44', '2015-08-06 15:49:44', null), ('167', '0', '13', '业务标识命名规范', '### 历史背景\n业务方在调用用户中心登录，注册等相关接口时，业务来源标识src或from处于混乱，不可控状态，非常不利于数据统计分析。\n\n### 实现目标\n为各业务方提供更精细的统计数据（如：可以展示大业务总的登录量和注册量，同时，也可以精确展示大业务下各子业务的登录量和注册量），帮助各业务方作产品决策。\n\n### 名词解释\n终端：是指包括个人电脑，手机，平板电脑等在内的用户操作平台。如下表：\n\n|终端|标识|备注|\n|----|----|----|\n|个人电脑WEB端|pcw||\n|个人电脑客户端|pcc||\n|手机WEB端|mpw||\n|手机客户端|mpc||\n|平板电脑WEB端|padw||\n|平板电脑客户端|padc||\n|手机统一登录器端|mpl|手机统一登录器专用终端，<br>这个是特例，其它业务无需关注。|\n\n### 命名规范\n业务标识标准形式\n\n`终端_大业务标识_子业务标识_扩展业务标识`\n\n- `终端`详见*名字解释部分*，请根据实际业务场景选用\n- `大业务标识`和`子业务标识`由*数字*和*字母*组成。`扩展业务标识`由*数字*、*字母*、*-(中划线)*组成\n- `终端`和`大业务标识`一定存在，其余字段根据具体情况可能为空\n- `大业务标识`和`子业务标识`由用户中心分配，[申请流程](#start.md/申请业务标识)\n- `扩展业务标识`请于用户中心沟通后使用\n\n### 示例\n以游戏中心为例\n\n如果申请到的 `大业务标识` 是 `wan` 那么：\n\n对应的PC端业务，业务标识为 `pcw_wan`\n对应的手机客户端，业务标识为 `mpc_wan`\n对于WEB端推广业务，推广“忘仙”游戏，业务标识可能为 `pcs_wan_tg_wangxian`\n\n', '2015-08-06 15:50:05', '2015-08-06 15:50:05', null), ('168', '0', '13', '快速上手', '### 申请业务标识\n发送邮件至 [g-quc@list.qihoo.net](mailto:g-quc@list.qihoo.net)，邮件内容如下(以用户中心为例)：<br>\n业务部门：*个人中心*\n业务使用场景：*个人中心接入通用登录、注册*\n申请试用的标识为：*pcw_i360*  [查看业务标识命名规范](#srcname.md)\n上线后使用的域名：*http://i.360.cn*\n相关产品和技术负责人信息：\n　　*技术：张三 zhangsan@360.cn 18612345678*\n　　*产品：李四 lisi@360.cn 18587654321*\n\n### 服务端部署\n- 将psp_jump.html部署到服务器根目录下，psp_jump.html文件可以从下面地址下载\n```js\n	http://jssdk.passport.corp.qihoo.net/psp_jump.html\n```\n- login.[当前二级域名].cn/com **cname** 到 login.360.cn\n\n### 引入sdk js脚本\n在页面中引用jquery库和sdk js脚本文件\n```html\n	<script src=\"http://s0.qhimg.com/lib/jquery/191.js\"></script>\n	<script src=\"http://js.passport.qihucdn.com/5.0.2.js\"></script>\n```\n***SDK 依赖jQuery 1.8.0及以上版本，推荐使用1.9.1，我们后期会进行QWarp的适配***\n\n### 执行初始化命令\n**任何业务方法执行前必须执行 `QHPass.init` 方法**\n`QHPass.init` 方法详细文档见[这里](#function/init.md)\n```js\n	QHPass.init(src); //src为第一步中申请的 业务标志\n```\n\n### 配置功能（可选）\n`QHPass.setConfig` 方法详细文档见[这里](#utils/config.md)\n```js\n	QHPass.setConfig(src);\n```\n\n### 执行业务\n执行登录、注册等业务，[参见](#function/function.md)\n```js\n	QHPass.signUp();\n	QHPass.signIn();\n```\n\n### 完整示例\n```html\n<!DOCTYPE html>\n<html>\n<head>\n	<meta charset=\"utf-8\">\n	<title>QHPass 使用示例</title>\n</head>\n<body>\n<button id=\"signIn\">登录</button>\n<script src=\"http://s0.qhimg.com/lib/jquery/191.js\"></script>\n<script src=\"http://js.passport.qihucdn.com/5.0.2.js\"></script>\n<script>\n	QHPass.init(\'pcw_i360_test\');\n	QHPass.setConfig(\'signIn.types\', [\'quick\', \'normal\', \'mobile\']);\n	$(\'#signIn\').click(function() {\n		QHPass.getUserInfo(function(userInfo) {\n			alert(\'用户已经登录\');\n		}, function() {\n			QHPass.signIn(function() {\n				alert(\'登录成功\');\n			});\n		});\n	});\n</script>\n</body>\n</html>\n```\n', '2015-08-06 15:50:34', '2015-08-06 15:50:34', null), ('169', '0', '0', '绑定手机号', '### 格式\n```js\n	QHPass.bindMobile( [wrapper], [callback] );\n```\n\n### 概述\n绑定手机功能，不能修改已绑定的手机号。\n\n### 使用条件\n- 用户处于已登录状态\n- 用户不能为第三方登录\n\n### 参数\n- `[wrapper]` {Object} 传空时弹出浮层显示，传入Element则在该Element中显示。\n- `[callback]` {Boolean|String|Function} 操作成功后执行。传 **true** 时刷新页面，传 **url** 时跳转到该url，传 **function** 时执行该function，其他情况不做任何操作。\n\n### 返回值\n无\n\n### 配置项\n- &clubs; `bindMobile.panelTitle` (Ver 5.0.2+) {String} 默认值：“绑定手机号”。\n浮层标题\n- &clubs; `bindMobile.panelCloseHandler` (Ver 5.0.2+) {Function}\n浮层关闭后的回调函数\n\n*标注 &clubs; 的配置仅对默认UI有效*\n\n### 事件列表\n- `init.bindMobile` 模块初始化\n- &clubs; `beforeShow.bindMobile` 模块展示前(插入DOM tree之前)\n参数：`el` 当前组件DOM对象\n- &clubs; `afterShow.bindMobile` 模块展示后(插入DOM tree之后)\n参数：`el` 当前组件DOM对象\n- &clubs; `beforeHide.bindMobile` 模块隐藏前\n参数：`el` 当前组件DOM对象\n- &clubs; `afterHide.bindMobile` 隐藏隐藏后\n参数：`el` 当前组件DOM对象\n- `showLoading.bindMobile` 展示模块之前需要从服务端异步拉取信息，拉取前会触发该事件\n- `hideLoading.bindMobile` 异步信息拉取成功后触发该事件\n- `invalid.bindMobile` 用户信息提交错误导致(远程或本地)检验失败\n参数 `error` 错误对象 包含errno(错误号)、和errmsg(错误信息)等属性\n\n*标注 &clubs; 的事件仅对默认UI有效*\n\n### 示例\n#### 浮层显示\n```js\n	QHPass.init(\'pcw_i360_test\');\n	QHPass.bindMobile();\n```\n\n#### 在页面中显示\n```js\n	var $wrapper = $(\'.bind-mobile-wrapper\').show();\n\n	QHPass.init(\'pcw_i360_test\');\n	QHPass.bindMobile($wrapper[0]);\n```\n\n<div class=\"bind-mobile-wrapper\" style=\"border:2px solid #666; display: none;\"></div>\n', '2015-08-06 15:51:27', '2015-08-06 15:51:27', null), ('170', '0', '14', '补全资料', '### 格式\n```js\n	QHPass.fillProfile( [wrapper], [callback] );\n```\n\n### 概述\n显示补全资料\n\n### 参数\n- `[wrapper]` {Object} 传空时弹出浮层显示，传入Element则在该Element中显示。\n- `[callback]` {Boolean|String|Function} 操作成功后执行。传 **true** 时刷新页面，传 **url** 时跳转到该url，传 **function** 时执行该function，其他情况不做任何操作。\n\n### 使用条件\n- 用户为第三方登陆用户\n- 用户没有补全过资料\n\n### 回调函数参数\n- callback(param)\n```js\n	param = {\n		qid :           {Number} 用户ID\n		type : \'bind\'   {String} 注册类型 (固定值)\n		crumb :         {String} 用户标识\n		img_url :       {String} 头像地址\n		username :      {String} 用户名\n		nickname :      {String} 昵称\n		timestamp :     {Number} 服务器时间戳\n		login_email:    {String} 登录邮箱\n	}\n```\n\n### 返回值\n无\n\n### 配置项\n- &clubs; `fillProfile.hidePasswordAgain` {Boolean} 默认值：false。\n是否在表单中隐藏 **重复密码** 字段。\n- &clubs; `fillProfile.panelTitle` (Ver 5.0.2+) {String} 默认值：“完善帐号资料”。\n浮层标题\n- &clubs; `fillProfile.panelCloseHandler` (Ver 5.0.2+) {Function}\n浮层关闭后的回调函数\n\n*标注 &clubs; 的配置仅对默认UI有效*\n\n### 事件列表\n- `init.fillProfile` 模块初始化\n- &clubs; `beforeShow.fillProfile` 模块展示前(插入DOM tree之前)\n参数：`el` 当前组件DOM对象\n- &clubs; `afterShow.fillProfile` 模块展示后(插入DOM tree之后)\n参数：`el` 当前组件DOM对象\n- &clubs; `beforeHide.fillProfile` 模块隐藏前\n参数：`el` 当前组件DOM对象\n- &clubs; `afterHide.fillProfile` 隐藏隐藏后\n参数：`el` 当前组件DOM对象\n- `invalid.fillProfile` 用户信息提交错误导致(远程或本地)检验失败\n参数 `error` 错误对象 包含errno(错误号)、和errmsg(错误信息)等属性\n\n*标注 &clubs; 的事件仅对默认UI有效*\n\n### 示例\n#### 浮层显示\n```js \n	QHPass.init(\'pcw_i360_test\');\n	QHPass.fillProfile(function(res) {\n		console.log(res);\n		alert(\'补全资料成功\');\n	});\n```\n\n#### 在页面中显示\n```js\n	var $wrapper = $(\'.fill-profile-wrapper\').show();\n\n	QHPass.init(\'pcw_i360_test\');\n	QHPass.fillProfile($wrapper[0], function(res) {\n		console.log(res);\n	});\n```', '2015-08-06 15:52:13', '2015-08-06 15:52:13', null), ('171', '0', '13', '获取用户邮箱的信息', '### 格式\n```js\n	QHPass.getEmailStatus( callback );\n```\n\n### 概述\n获取当前帐号的邮箱的信息\n\n详见*回调函数参数*\n\n### 使用条件\n- 用户处于已登录状态\n\n### 参数\n- `callback` {Function} 回调函数\n\n### 回调函数参数\n- callback(param)\n```js\nparam = {\n	errmsg:                     {String} 错误信息\n	errno:                      {Number} 错误代码\n	------ 当存在错误时，不包含以下信息 ------\n	isOverLimit:                {Boolean} 是否超限\n	loginEmail:                 {String} 登录邮箱（已经激活）\n	loginEmailUnactivated:      {String} 待激活登录邮箱\n	needActive:                 {Boolean} 登录邮箱是否需要激活\n	safeLoginEmail:             {String} 登录邮箱加扰（中间位数加密，已经激活）\n	safeLoginEmailUnactivated:  {String} 待激活登录邮箱加扰（中间位数加密）\n}\n```\n\n### 返回值\n无\n\n### 示例\n```js\n	QHPass.getEmailStatus(function(data){\n		console.log(data);\n	});\n```', '2015-08-06 15:52:38', '2015-08-06 15:52:38', null), ('172', '0', '14', '获取快速登录状态', '### 格式\n```js\n	QHPass.getQuickLoginStatus( [timeOut], callback );\n```\n\n### 概述\n检测网页是否可以获取客户端登录状态\n\n### 参数\n- `[timeOut=20000]` {Number} 超时时间，单位:毫秒\n- `callback` {Function} 回调函数\n\n### 回调函数参数\n- callback(param)\n```js\nparam = {\n	errno :     {Number} 用户标识\n	errmsg :    {String} 错误信息\n	------ 当存在错误时，不包含以下信息 ------\n	status :    {Enum} 1:可以快速登录 2:无法快速登录（检测失败或客户端未登录等）\n}\n```\n\n### 返回值\n无\n\n### 示例\n```js\n	QHPass.getQuickLoginStatus(function(data){\n		console.log(data);\n	});\n```', '2015-08-06 15:53:03', '2015-08-06 15:53:03', null), ('173', '0', '14', '获取用户信息', '### 格式\n```js\n	QHPass.getUserInfo( [arg], successCB, [failCB] );\n```\n\n### 概述\n获取用户信息\n\n默认获取本域缓存信息，可以通过设置`arg`参数，指定要获取信息的域，或指定不使用缓存\n\n### 使用条件\n- 用户处于已登录状态\n\n### 参数\n- `[arg=true]` {String|Boolean} 为true时优先使用缓存，为url时从url对应域取信息\n- `successCB` {Function} 成功回调函数\n- `[failCB]` {Function} 失败回调函数\n\n### 回调函数参数：\n- successCB(param)\n```js\nparam = {\n	qid :           {Number} 用户ID\n	type :          {String} 注册类型 (formal, bind, XXX)\n	crumb :         {String} 用户标识\n	img_url :       {String} 头像地址（预留）\n	username :      {String} 用户名\n	nickname :      {String} 昵称\n	timestamp :     {Number} 服务器时间戳\n	login_email:    {String} 登录邮箱\n}\n```\n- failCB(error)\n```js\nerror = {\n	errno :         {Number} 错误代码\n	errmsg :        {String} 错误信息\n}\n```\n\n### 返回值\n空\n\n### 示例\n\n```js\n	// 取本域用户信息\n	QHPass.getUserInfo(function(data){\n		console.log(data);\n	}, function(error) {\n		console.log(error);\n	});\n```\n\n```js\n	// 取so.com域下用户信息\n	var hostname = \"so.com\";\n	QHPass.getUserInfo(hostname, function(data){\n		console.log(data);\n	}, function(error) {\n		console.log(error);\n	});\n```\n\n```js\n	// 分别从缓存和服务器取用户信息\n	QHPass.getUserInfo(function(data){\n		console.log(\'开始时间：\' + new Date().getTime());\n\n		// 从缓存取数据\n		QHPass.getUserInfo(function(data){\n			console.log(\'从缓存读取结束时间：\' + new Date().getTime());\n			console.log(data);\n		});\n\n		// 从服务器取数据\n		QHPass.getUserInfo(false, function(data){\n			console.log(\'从服务器读取结束时间：\' + new Date().getTime());\n			console.log(data);\n		});\n	});\n```\n\n```js\n	// 特殊场景，cookie保存在二级域名上，以1360.com为例\n\n	// 配置domainList，填写自己需要同步登录到的二级域名\n	QHPass.setConfig(\'domainList\', [\'wan.1360.com\', \'game.1360.com\', \'kaifang.1360.com\']);\n\n	// 查询信息时同样需要指定一个二级域名\n	QHPass.getUserInfo(\'wan.1360.com\', successCB, failCB);\n```\n', '2015-08-06 15:54:06', '2015-08-06 15:54:06', null), ('174', '0', '14', '获取用户密保信息', '### 格式\n```js\n	QHPass.getUserSecInfo( callback );\n```\n\n### 概述\n获取当前登录帐号密保信息\n\n注：本接口保留备用，目前用处不大，业务可用来判断用户是否绑定手机号码和密保邮箱信息。\n\n### 使用条件\n- 用户处于已登录状态\n\n### 参数\n- `callback` {Function} 回调函数\n\n### 回调函数参数：\n- callback(param)\n```js\nparam = {\n	errno :         {Number} 用户标识\n	errmsg :        {String} 错误信息\n	------ 当存在错误时，不包含以下信息 ------\n	safeSecMobile : {Number} 用户绑定的手机号（中间位数加密）\n	safeSecEmail : {String} 用户绑定的密保邮箱（中间位数加密）\n}\n```\n\n### 返回值\n无\n\n### 示例\n```js\n	QHPass.getUserSecInfo(function(data){\n		console.log(data);\n	});\n```', '2015-08-06 15:54:36', '2015-08-06 15:54:36', null), ('175', '0', '14', '初始化', '### 格式\n```js\n	QHPass.init( [config] );\n```\n\n### 概述\n初始化QHPass，并设置参数\n\n注:多次调用只执行一次初始化操作，后几次调用相当于执行`QHPass.setConfig(config)`\n\n### 参数\n- `[config]` {Object|String} 配置参数 或 项目src。\n\n### 返回值\n无\n\n### 示例\n```js\n	// 不带参数\n	QHPass.init();\n\n\n	// 带参数(以下两种写法等效)\n	QHPass.init(\'pcw_i360_test\');\n\n	QHPass.init({src: \'pcw_i360_test\'});\n\n\n	// 以下两种写法等效\n	QHPass.init({src: \'pcw_i360_test\', protocol: \'https\', charset: \'gbk\'});\n\n	QHPass.init();\n	QHPass.setConfig({src: \'pcw_i360_test\', protocol: \'https\', charset: \'gbk\'});\n```', '2015-08-06 15:54:56', '2015-08-06 15:54:56', null), ('177', '0', '17', 'test', '# test', '2015-08-07 11:12:56', '2015-08-07 11:12:56', null), ('178', '0', '13', 'tererreare', 'teareraere', '2015-08-24 11:10:14', '2015-08-24 11:10:14', null);
COMMIT;

-- ----------------------------
--  Table structure for `fk_user`
-- ----------------------------
DROP TABLE IF EXISTS `fk_user`;
CREATE TABLE `fk_user` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` char(32) NOT NULL,
  `nickname` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `group` varchar(255) DEFAULT NULL,
  `status` enum('normal') NOT NULL DEFAULT 'normal',
  `add_time` datetime DEFAULT NULL,
  `add_ip` varchar(255) DEFAULT NULL,
  `last_login_time` datetime DEFAULT NULL,
  `last_login_ip` varchar(255) DEFAULT NULL,
  `login_count` smallint(6) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

-- ----------------------------
--  Records of `fk_user`
-- ----------------------------
BEGIN;
INSERT INTO `fk_user` VALUES ('1', 'admin', '582b5ebef260ea110c98950aa3c7007c', '管理员', 'admin@firekylin.org', 'super admin', 'normal', '2015-08-11 18:52:38', '0.0.0.0', '2015-08-11 18:52:41', '127.0.0.1', '16');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
