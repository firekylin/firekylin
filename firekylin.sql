# ************************************************************
# Sequel Pro SQL dump
# Version 4499
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: firekylindb.jedm.cn (MySQL 5.5.35-1ubuntu1)
# Database: firekylin
# Generation Time: 2015-11-27 10:48:06 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table fk_category
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_category`;

CREATE TABLE `fk_category` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

LOCK TABLES `fk_category` WRITE;
/*!40000 ALTER TABLE `fk_category` DISABLE KEYS */;

INSERT INTO `fk_category` (`id`, `name`)
VALUES
	(25,'ES6'),
	(26,'React'),
	(28,'nodejs'),
	(118,'cc'),
	(119,'dd'),
	(120,'javascript');

/*!40000 ALTER TABLE `fk_category` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_config
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_config`;

CREATE TABLE `fk_config` (
  `key` char(20) NOT NULL,
  `value` text,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

LOCK TABLES `fk_config` WRITE;
/*!40000 ALTER TABLE `fk_config` DISABLE KEYS */;

INSERT INTO `fk_config` (`key`, `value`)
VALUES
	('author','陈凯'),
	('discuss_commoncode','<script type=\"text/javascript\">\nvar duoshuoQuery = {short_name:\"firekylin\"};\n	(function() {\n		var ds = document.createElement(\'script\');\n		ds.type = \'text/javascript\';ds.async = true;\n		ds.src = (document.location.protocol == \'https:\' ? \'https:\' : \'http:\') + \'//static.duoshuo.com/embed.js\';\n		ds.charset = \'UTF-8\';\n		(document.getElementsByTagName(\'head\')[0] \n		 || document.getElementsByTagName(\'body\')[0]).appendChild(ds);\n	})();\n	</script>'),
	('discuss_numbercode','<span class=\"ds-thread-count\" data-thread-key=\"$$id$$\" data-count-type=\"comments\">加载中</span>'),
	('discuss_on','true'),
	('discuss_pagecode','<div class=\"ds-thread\" data-thread-key=\"$$id$$\" data-title=\"$$title$$\" data-url=\"$$url$$\"></div>'),
	('post_showurl','true'),
	('rss_excerpt','false'),
	('rss_number','10'),
	('rss_on','true'),
	('share_number','true'),
	('share_on','true'),
	('share_other','false'),
	('share_size','jiathis_style_24x24'),
	('share_to_facebook','true'),
	('share_to_twitter','true'),
	('share_to_weibo','true'),
	('share_to_weixin','true'),
	('sns_email','firekylin@jedm.cn'),
	('sns_facebook','jedmeng'),
	('sns_github','chenkaiC4'),
	('subtitle','吃葡萄不吐葡萄皮'),
	('theme','default'),
	('title','博客'),
	('url','');

/*!40000 ALTER TABLE `fk_config` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_imghash
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_imghash`;

CREATE TABLE `fk_imghash` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `basename` varchar(50) NOT NULL DEFAULT '',
  `md5` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `fk_imghash` WRITE;
/*!40000 ALTER TABLE `fk_imghash` DISABLE KEYS */;

INSERT INTO `fk_imghash` (`id`, `basename`, `md5`)
VALUES
	(10,'m1fUqXwTMxy3ehy29G3equHG.jpg','e14456ad83e611720cd9b843bbd5af11'),
	(11,'75hdOExtiD3VJIj1dTJpSTwk.jpg','a4b3cd82f9cef87473be435bfdccce5f'),
	(12,'SSEC0rGlTVhM1V7yla5JUgWd.jpg','7d4a064e530cffcb9e38466b07d6b119'),
	(13,'fz8bs00b6IUYh6zKq_BtAoml.png','bd5688c7e3e40a02d1d0009cd2503eee'),
	(14,'xmgerhf-fBNRwPr05lhwWqbA.jpg','d5ff16e255689a4f0060b7596d888729');

/*!40000 ALTER TABLE `fk_imghash` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_post
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_post`;

CREATE TABLE `fk_post` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `date` datetime NOT NULL,
  `status` int(3) unsigned NOT NULL DEFAULT '1' COMMENT '1：已上线；2：草稿；3：历史',
  `modify_date` datetime DEFAULT NULL,
  `modify_user_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

LOCK TABLES `fk_post` WRITE;
/*!40000 ALTER TABLE `fk_post` DISABLE KEYS */;

INSERT INTO `fk_post` (`id`, `user_id`, `category_id`, `title`, `content`, `date`, `status`, `modify_date`, `modify_user_id`)
VALUES
	(166,1,26,'Markdown 简明指南','## 什么是 Markdown\n\nMarkdown 是一种轻量级标记语言，创始人为约翰·格鲁伯（John Gruber）和亚伦·斯沃茨（Aaron Swartz）。它允许人们“使用易读易写的纯文本格式编写文档，然后转换成有效的XHTML(或者HTML)文档”。这种语言吸收了很多在电子邮件中已有的纯文本标记的特性。\n\n简而言之，Markdown 至少有以下优点：\n\n* 纯文本，所以兼容性极强，可以用所有文本编辑器打开。\n* 让你专注于文字而不是排版。\n* 格式转换方便，Markdown 的文本你可以轻松转换为 html、电子书等。\n* Markdown 的标记语法有极好的可读性。\n\nMarkdown 语法比较灵活，本文只挑选最常用的写法来介绍。完整文档请前往 [Markdown 官网](http://daringfireball.net/projects/markdown/syntax)查看。\n\n## 一、标题\n\n在 Markdown 中，你只需要在文本前面加上 # 即可，同理、你还可以增加二级标题、三级标题、四级标题、五级标题和六级标题，总共六级，只需要增加  # 即可，标题字号相应降低。例如：\n\n```\n# 一级标题\n## 二级标题\n### 三级标题\n#### 四级标题\n##### 五级标题\n###### 六级标题\n```\n\n注：# 和「一级标题」之间建议保留一个字符的空格，这是最标准的 Markdown 写法。\n\n上面的例子最终效果是这样的：\n\n# 一级标题\n## 二级标题\n### 三级标题\n#### 四级标题\n##### 五级标题\n###### 六级标题\n\n## 二、列表\n\n列表格式也很常用，在 Markdown 中，你只需要在文字前面加上 - 就可以了，例如：\n\n```\n- 文本1\n- 文本2\n- 文本3\n```\n\n如果你希望有序列表，也可以在文字前面加上 1. 就可以了，例如：\n\n```\n1. 文本1\n1. 文本2\n1. 文本3\n```\n\n注：-、1.和文本之间要保留一个字符的空格。\n\n上面的例子最终效果是这样的：\n\n- 文本1\n- 文本2\n- 文本3\n\n1. 文本1\n1. 文本2\n1. 文本3\n\n## 三、链接和图片\n\n在 Markdown 中，插入链接只需要使用 `[链接文本](链接地址 \"链接title\")` 这样的语法即可（title 可省略），例如：\n\n```\n[360导航](http://hao.360.cn \"这是个链接\")\n```\n\n在 Markdown 中，插入图片只需要使用 `![图片alt](图片链接地址 \"图片title\")` 这样的语法即可（title 可省略），例如：\n\n```\n![360导航](http://p1.qhimg.com/t01a21cb7d399f87a40.png)\n```\n\n注：插入图片的语法和链接的语法很像，只是前面多了一个 ！。\n\n如果要给图片加链接，也很简单。把`链接`语法中的`链接文本`替换为图片语法就可以了。\n\n```\n[![360导航](http://p1.qhimg.com/t01a21cb7d399f87a40.png)](http://hao.360.cn \"这是个链接\")\n```\n\n上面的例子最终效果是这样的：\n\n[360导航](http://hao.360.cn \"这是个链接\")\n![360导航](http://p1.qhimg.com/t01a21cb7d399f87a40.png)\n[![360导航](http://p1.qhimg.com/t01a21cb7d399f87a40.png)](http://hao.360.cn \"这是个链接\")\n\n## 四、引用\n\n在 Markdown 中，你只需要在你希望引用的文字前面加上 > 就好了，例如：\n\n```\n> 这是一段引用的文字哦。\n```\n\n注：> 和文本之间要保留一个字符的空格。\n\n上面的例子最终效果是这样的：\n\n> 这是一段引用的文字哦。\n\n`>`也可以跟其它语法结合使用，例如：\n\n```\n> ### 标题2\n> - 列表1\n> - 列表2\n\n```\n\n解析后是这样的：\n\n> ### 标题2\n> - 列表1\n> - 列表2\n\n## 五、粗体和斜体\n\nMarkdown 的粗体和斜体也非常简单，用两个 `*` 包含一段文本就是粗体的语法，用一个 `*`包含一段文本就是斜体的语法。例如：\n\n```\n我们都是*程序员*，我们来自**奇舞团**。\n```\n\n解析是后这样的（一个和两个`*`分别被解析为：`em`和`strong`）：\n\n我们都是*程序员*，我们来自**奇舞团**。\n\n## 六、代码\n\n简单的代码，如参数、方法等关键字，可以使用 ` `` `定义，如：\n\n```\n`Cookie`类有`set`和`set`两个方法。\n```\n\n解析后是这样的：\n\n`Cookie`类有`set`和`set`两个方法。\n\n成段的代码，可以使用下面的方法定义，如：\n\n	```\n	<script>\n		alert(\'hello world!\');\n	</script>\n	```\n\n另外，还可以用下面这种写法指定代码语言，目前支持 `html`，`js`，`css` 这几种。\n\n	```html\n	<script>\n		alert(\'hello world!\');\n	</script>\n	```\n\n解析后是这样的：\n\n```html\n<script>\n	alert(\'hello world!\');\n</script>\n```\n\n对于可执行代码，可以在js或html后添加`:run`，例如：\n	```js:run\n		alert(\'hello world\');\n	```\n	```html:run\n		<body>\n			hello world\n		</body>\n	```\n这样这段代码可以执行\n\n解析后是这样的：\n```js:run\n	alert(\'hello world\');\n```\n```html:run\n	<body>\n		hello world\n	</body>\n```\n\n## 七、表格\n\n这是一个表格的 Markdown 语法：\n\n```\n| 表头1 | 表头2 | 表头3 |\n| ---- | ---- | ---- |\n| 1    | 2    | 3    |\n| 1111 | 2222 | 3333 |\n```\n\n显示效果为：\n\n| 表头1 | 表头2 | 表头3 |\n| ---- | ---- | ---- |\n| 1    | 2    | 3    |\n| 1111 | 2222 | 3333 |\n\n如果要控制表格某一列的对齐方式，也很简单（请留意第二行的英文冒号）：\n\n```\n| 左对齐（默认） | 居中对齐 | 右对齐 |\n| :----------  | :-----: | ----: |\n| 1            | 2       | 3     |\n| 1111         | 2222    | 3333  |\n```\n\n显示效果为：\n\n| 左对齐（默认） | 居中对齐 | 右对齐 |\n| :----------  | :-----: | ----: |\n| 1            | 2       | 3     |\n| 1111         | 2222    | 3333  |\n\n表格当然也可以跟其它语法结合使用，如：\n\n```\n| 表头1 | 表头2 | 表头3 |\n| ---- | ---- | ---: |\n| 1    | 2    | 3    |\n| `code` | *我变斜了* | **我是加粗的** |\n```\n\n显示效果为：\n\n| 表头1 | 表头2 | 表头3 |\n| ---- | ---- | ---: |\n| 1    | 2    | 3    |\n| `code` | *我变斜了* | **我是加粗的** |\n','2015-08-06 15:49:44',1,'2015-11-23 20:37:49',1);

/*!40000 ALTER TABLE `fk_post` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_post_tag
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_post_tag`;

CREATE TABLE `fk_post_tag` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  `status` int(3) DEFAULT '1' COMMENT '1：已上线；2：草稿；3：历史',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `fk_post_tag` WRITE;
/*!40000 ALTER TABLE `fk_post_tag` DISABLE KEYS */;

INSERT INTO `fk_post_tag` (`id`, `post_id`, `tag_id`, `status`)
VALUES
	(41,166,5,1),
	(42,166,4,1);

/*!40000 ALTER TABLE `fk_post_tag` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_tag
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_tag`;

CREATE TABLE `fk_tag` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT '',
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `fk_tag` WRITE;
/*!40000 ALTER TABLE `fk_tag` DISABLE KEYS */;

INSERT INTO `fk_tag` (`id`, `name`, `user_id`)
VALUES
	(4,'javaScritp',1),
	(5,'css',1);

/*!40000 ALTER TABLE `fk_tag` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_user
# ------------------------------------------------------------

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

LOCK TABLES `fk_user` WRITE;
/*!40000 ALTER TABLE `fk_user` DISABLE KEYS */;

INSERT INTO `fk_user` (`id`, `username`, `password`, `nickname`, `email`, `group`, `status`, `add_time`, `add_ip`, `last_login_time`, `last_login_ip`, `login_count`)
VALUES
	(1,'admin','582b5ebef260ea110c98950aa3c7007c','管理员','admin@firekylin.org','super admin','normal','2015-08-11 18:52:38','0.0.0.0','2015-08-11 18:52:41','127.0.0.1',166);

/*!40000 ALTER TABLE `fk_user` ENABLE KEYS */;
UNLOCK TABLES;



/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
