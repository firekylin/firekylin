# ************************************************************
# Sequel Pro SQL dump
# Version 4529
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.01 (MySQL 5.7.10)
# Database: firekylin
# Generation Time: 2016-02-26 01:55:35 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table fk_cate
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_cate`;

CREATE TABLE `fk_cate` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8 NOT NULL,
  `pid` int(11) NOT NULL DEFAULT '0',
  `pathname` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `fk_cate` WRITE;
/*!40000 ALTER TABLE `fk_cate` DISABLE KEYS */;

INSERT INTO `fk_cate` (`id`, `name`, `pid`, `pathname`)
VALUES
	(13,'分类一',0,'hello'),
	(14,'子分类',13,'son-cate');

/*!40000 ALTER TABLE `fk_cate` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_options
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_options`;

CREATE TABLE `fk_options` (
  `key` varchar(255) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `value` text CHARACTER SET utf8,
  `desc` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `fk_options` WRITE;
/*!40000 ALTER TABLE `fk_options` DISABLE KEYS */;

INSERT INTO `fk_options` (`key`, `value`, `desc`)
VALUES
	('analyze_code',NULL,'统计代码，可以添加百度统计、Google 统计等'),
	('description','A Simple & Fast Node Bloging Platform Base On ThinkJS 2.0 & ReactJS & ES6/7','网站描述'),
	('github_blog','welefen/blog','GitHub blog 地址，如果填了则同步到 GitHub 上'),
	('github_url',NULL,'GitHub 地址'),
	('image_upload',NULL,'图片存放的位置，默认存在放网站上。也可以选择放在七牛或者又拍云等地方'),
	('keywords',NULL,'网站关键字'),
	('logo_url',NULL,'logo 地址'),
	('miitbeian',NULL,'网站备案号'),
	('num_per_page','10','文章一页显示的条数'),
	('password_salt','firekylin','密码 salt，网站安装的时候随机生成一个'),
	('title','Firekylin 系统','网站标题'),
	('two_factor_auth','0','是否开启二步验证'),
	('weibo_url',NULL,'微博地址');

/*!40000 ALTER TABLE `fk_options` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_post
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_post`;

CREATE TABLE `fk_post` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `type` tinyint(11) NOT NULL DEFAULT '0' COMMENT '0 为文章，1 为页面',
  `status` tinyint(11) NOT NULL DEFAULT '0' COMMENT '0 为草稿，1 为待审核，2 为已拒绝，3 为已经发布',
  `title` varchar(255) CHARACTER SET utf8 NOT NULL,
  `pathname` varchar(255) CHARACTER SET utf8 NOT NULL DEFAULT '' COMMENT 'URL 的 pathname',
  `summary` text,
  `markdown_content` text CHARACTER SET utf8 NOT NULL,
  `content` text CHARACTER SET utf8 NOT NULL,
  `allow_comment` tinyint(11) NOT NULL DEFAULT '1' COMMENT '1 为允许， 0 为不允许',
  `create_time` datetime NOT NULL,
  `update_time` datetime NOT NULL,
  `is_public` tinyint(11) NOT NULL DEFAULT '1' COMMENT '1 为公开，0 为不公开',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `fk_post` WRITE;
/*!40000 ALTER TABLE `fk_post` DISABLE KEYS */;

INSERT INTO `fk_post` (`id`, `user_id`, `type`, `status`, `title`, `pathname`, `summary`, `markdown_content`, `content`, `allow_comment`, `create_time`, `update_time`, `is_public`)
VALUES
	(15,2,0,0,'水电费水电费','水电费水电费','abc','abc','第三方士大夫',1,'2016-02-25 20:53:22','2016-02-25 20:53:22',1),
	(16,2,0,0,'sdfsdfs','sdfsdfsdf','abc','abc','sdfsdf',1,'2016-02-25 20:54:45','2016-02-25 20:54:45',1),
	(17,2,1,1,'类型测试','类型测试','abc','abc','类型测试',1,'2016-02-25 20:56:33','2016-02-25 20:56:33',1),
	(18,2,0,3,'你好世界','hello-world','<p>七牛是提供了 NodeJS 的 SDK 的，这就为我们的使用带来了极大的方便。我们需要知道以下四个信息：</p>\n<ul>\n<li><code>access_key</code>, <code>secret_key</code>：可以在 <a href=\"https://portal.qiniu.com/user/key\">https://portal.qiniu.com/user/key</a> 上获取，如果没有则新建一对密钥。</li>\n<li><code>bucket</code>：对应的是空间名称，如果没有空间则需要新建一个空间。</li>\n<li><code>domain</code>：对应的是空间的域名，可以在 <a href=\"https://portal.qiniu.com/bucket/setting/domain?bucket=你的空间名称\">https://portal.qiniu.com/bucket/setting/domain?bucket=你的空间名称</a> 中找到。</li>\n</ul>\n<p>有了以上基本信息之后我们就可以在 ThinkJS 的基础上添加七牛图床了！首先我们需要新建一个 ThinkJS 项目，在命令行中执行：</p>\n<pre><code class=\"hljs lang-sql\">//如果没有 thinkjs 命令则首先需要 npm <span class=\"hljs-keyword\">install</span> -g thinkjs\n$ thinkjs <span class=\"hljs-keyword\">new</span> thinkjs-niu <span class=\"hljs-comment\">--es6</span>\n</code></pre><p>我们可以进入项目根目录安装依赖然后 start 一下，然后访问 <a href=\"http://localhost:8360\">http://localhost:8360</a> 就会发现我们的 ThinkJS 项目已经可以正常访问啦！</p>\n<pre><code class=\"hljs lang-elixir\"><span class=\"hljs-variable\">$ </span>cd thinkjs-niu\n<span class=\"hljs-variable\">$ </span>npm install\n<span class=\"hljs-variable\">$ </span>npm start\n</code></pre><p>之前我们说到七牛有自己的 NodeJS SDK，所以下一步我们要先把 SDK 安装上，进入项目根目录后执行：</p>\n<pre><code class=\"hljs lang-sql\">$ npm <span class=\"hljs-keyword\">install</span> qiniu <span class=\"hljs-comment\">--save</span>\n</code></pre><p>将我们在最开始获取到的四个信息配置到 config 里面，打开 <code>src/home/config/config.js</code> 并按照如下所示补充内容：</p>\n<pre><code class=\"hljs lang-javascript\"><span class=\"hljs-meta\">\"use strict\"</span>;\n<span class=\"hljs-comment\">/**\n * config\n */</span>\n<span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> {\n  <span class=\"hljs-comment\">//key: value</span>\n  qiniu: {\n    access_key: <span class=\"hljs-string\">\"你的 access_key\"</span>,\n    secret_key: <span class=\"hljs-string\">\"你的 secret_key\"</span>,\n    bucket: <span class=\"hljs-string\">\"你的空间名称\"</span>,\n    domain: <span class=\"hljs-string\">\"你的空间域名\"</span>    \n  }\n};\n</code></pre>','七牛是提供了 NodeJS 的 SDK 的，这就为我们的使用带来了极大的方便。我们需要知道以下四个信息：\n\n- `access_key`, `secret_key`：可以在 <https://portal.qiniu.com/user/key> 上获取，如果没有则新建一对密钥。\n- `bucket`：对应的是空间名称，如果没有空间则需要新建一个空间。\n- `domain`：对应的是空间的域名，可以在 <https://portal.qiniu.com/bucket/setting/domain?bucket=你的空间名称> 中找到。\n\n有了以上基本信息之后我们就可以在 ThinkJS 的基础上添加七牛图床了！首先我们需要新建一个 ThinkJS 项目，在命令行中执行：\n\n    //如果没有 thinkjs 命令则首先需要 npm install -g thinkjs\n    $ thinkjs new thinkjs-niu --es6\n\n我们可以进入项目根目录安装依赖然后 start 一下，然后访问 <http://localhost:8360> 就会发现我们的 ThinkJS 项目已经可以正常访问啦！\n\n    $ cd thinkjs-niu\n    $ npm install\n    $ npm start\n\n之前我们说到七牛有自己的 NodeJS SDK，所以下一步我们要先把 SDK 安装上，进入项目根目录后执行：\n\n    $ npm install qiniu --save\n\n将我们在最开始获取到的四个信息配置到 config 里面，打开 `src/home/config/config.js` 并按照如下所示补充内容：\n\n```\n\'use strict\';\n/**\n * config\n */\nexport default {\n  //key: value\n  qiniu: {\n    access_key: \'你的 access_key\',\n    secret_key: \'你的 secret_key\',\n    bucket: \'你的空间名称\',\n    domain: \'你的空间域名\'    \n  }\n};\n```\n<!--more-->\n\n补充好后，继续打开 `src/home/controller/index.js` 并增加如下内容：\n\n```\n\'use strict\';\n\nimport Base from \'./base.js\';\nimport qiniu from \'qiniu\';\n\nexport default class extends Base {\n  /**\n   * index action\n   * @return {Promise} []\n   */\n  indexAction(){\n    let qconfig = this.config(\'qiniu\');\n    let putPolicy = new qiniu.rs.PutPolicy( qconfig.bucket );\n    qiniu.conf.ACCESS_KEY = qconfig.access_key;\n    qiniu.conf.SECRET_KEY = qconfig.secret_key;\n\n    this.assign({\n      uptoken: putPolicy.token(),\n      baseUrl: qconfig.domain\n    });\n\n    return this.display();\n  }\n}\n```\n\n七牛上传图片需要三个关键的东西，一个是根据 key 生成的密钥 token，一个是文件的名称，最后一个当然是文件。通过 `new qiniu.rs.PutPolicy(<bucket>).token()` 方法我们就可以直接获取到生成的密钥了。这里不得不吐槽一下 `qiniu.conf.ACCESS_KEY` 和 `qiniu.conf.SECRET_KEY` 这样的设定，直接在模块上增加属性我也是醉了。最后我们把生成好的 `uptoken` 和定义的空间域名传入到模板中就 OK 了！\n\n下面我们开始写我们的模板吧！模板的编写其实非常简单，清空 `view/home/index_index.html` 文件并添加如下代码：\n\n```\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"UTF-8\">\n  <title>ThinkJS Qiniu Demo</title>\n</head>\n<body>\n  <form method=\"post\" action=\"http://upload.qiniu.com/\"\n   enctype=\"multipart/form-data\">\n    <input name=\"key\" type=\"hidden\" value=\"\">\n    <input name=\"token\" type=\"hidden\" value=\"<%=uptoken%>\">\n    <input name=\"file\" type=\"file\" required/>\n    <button>OK</button>\n  </form>\n</body>\n</html>\n```\n\n保存后我们访问 <http://localhost:8360> 就可以进行测试了。选择图片并点击 OK 按钮后会提交文件到七牛的服务器上，七牛会返回类似一下内容的 JSON 字符串：\n\n    {\"hash\":\"lqRwoZzfZ6_2QHand2ix6AITjOw_\",\"key\":\"\"}\n\n其中 key 就是我们七牛线上保存的文件名，将其与空间域名拼接后就能获取到文件的 URL 地址了。不过此时我们会发现 key 是空的，那是因为我们并没有上传 key，代表着文件名为空。解决办法是在表单提交之前获取 file 控件的值并拿到文件名。同时我们还会发现由于是表单上传所以页面会进行跳转，为了不进行跳转我们必须将表单提交替换为 AJAX 模拟表单提交。按照如下代码修改模板：\n\n```\n<form method=\"post\" action=\"http://upload.qiniu.com/\"\n   enctype=\"multipart/form-data\" onsubmit=\"return send();\">\n  <input name=\"key\" type=\"hidden\" value=\"\">\n  <input name=\"token\" type=\"hidden\" value=\"<%=uptoken%>\">\n  <input name=\"file\" type=\"file\" required/>\n  <button>OK</button>\n</form>\n<script>\n/** 设置 key 值为文件名 **/\nfunction setKey() {\n  var key = document.querySelector(\'input[name=key]\');\n  var file = document.querySelector(\'input[name=file]\');\n  var filename = file.value.match(/[^\\/\\\\]+\\.\\w+$/);\n  if( !filename[0] ) {\n    return false;\n  }\n  key.value = filename[0];\n  return true;\n}\n\n/** 提交表单上传图片 **/\nfunction send() {\n  var xhr = new XMLHttpRequest(), button = document.querySelector(\"button\");\n  xhr.open(\"POST\", \"http://upload.qiniu.com\", true);\n  xhr.onload = function() {\n    button.removeAttribute(\"disabled\");\n    button.innerText = \"OK\";\n    \n    var res = JSON.parse( xhr.responseText );\n    prompt(\'你上传的文件地址是：\', \"<%=baseUrl%>\"+res.key);\n  }\n\n  button.setAttribute(\"disabled\", \"disabled\");\n  button.innerText = \"正在上传中...\";\n\n  setKey();\n  xhr.send(new FormData(document.querySelector(\"form\")));\n  return false;\n}\n</script>\n```\n\n动态设置文件名 key，增加 AJAX 表单提交，并在表单提交时修改按钮文字表示正在上传，上传结束之后弹窗提示用户文件的七牛地址。这样整个流程就完美了！本教程完整的示例代码可以从这里下载：[百度云][1] | [云盘（提取码：4fd4）][2]。下载解压 `npm install` 之后直接 `npm start` 即可运行。\n\n\n  [1]: http://pan.baidu.com/s/1i4vShCx\n  [2]: https://yunpan.cn/crZGIURYQpdjd','<p>七牛是提供了 NodeJS 的 SDK 的，这就为我们的使用带来了极大的方便。我们需要知道以下四个信息：</p>\n<ul>\n<li><code>access_key</code>, <code>secret_key</code>：可以在 <a href=\"https://portal.qiniu.com/user/key\">https://portal.qiniu.com/user/key</a> 上获取，如果没有则新建一对密钥。</li>\n<li><code>bucket</code>：对应的是空间名称，如果没有空间则需要新建一个空间。</li>\n<li><code>domain</code>：对应的是空间的域名，可以在 <a href=\"https://portal.qiniu.com/bucket/setting/domain?bucket=你的空间名称\">https://portal.qiniu.com/bucket/setting/domain?bucket=你的空间名称</a> 中找到。</li>\n</ul>\n<p>有了以上基本信息之后我们就可以在 ThinkJS 的基础上添加七牛图床了！首先我们需要新建一个 ThinkJS 项目，在命令行中执行：</p>\n<pre><code class=\"hljs lang-sql\">//如果没有 thinkjs 命令则首先需要 npm <span class=\"hljs-keyword\">install</span> -g thinkjs\n$ thinkjs <span class=\"hljs-keyword\">new</span> thinkjs-niu <span class=\"hljs-comment\">--es6</span>\n</code></pre><p>我们可以进入项目根目录安装依赖然后 start 一下，然后访问 <a href=\"http://localhost:8360\">http://localhost:8360</a> 就会发现我们的 ThinkJS 项目已经可以正常访问啦！</p>\n<pre><code class=\"hljs lang-elixir\"><span class=\"hljs-variable\">$ </span>cd thinkjs-niu\n<span class=\"hljs-variable\">$ </span>npm install\n<span class=\"hljs-variable\">$ </span>npm start\n</code></pre><p>之前我们说到七牛有自己的 NodeJS SDK，所以下一步我们要先把 SDK 安装上，进入项目根目录后执行：</p>\n<pre><code class=\"hljs lang-sql\">$ npm <span class=\"hljs-keyword\">install</span> qiniu <span class=\"hljs-comment\">--save</span>\n</code></pre><p>将我们在最开始获取到的四个信息配置到 config 里面，打开 <code>src/home/config/config.js</code> 并按照如下所示补充内容：</p>\n<pre><code class=\"hljs lang-javascript\"><span class=\"hljs-meta\">\"use strict\"</span>;\n<span class=\"hljs-comment\">/**\n * config\n */</span>\n<span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> {\n  <span class=\"hljs-comment\">//key: value</span>\n  qiniu: {\n    access_key: <span class=\"hljs-string\">\"你的 access_key\"</span>,\n    secret_key: <span class=\"hljs-string\">\"你的 secret_key\"</span>,\n    bucket: <span class=\"hljs-string\">\"你的空间名称\"</span>,\n    domain: <span class=\"hljs-string\">\"你的空间域名\"</span>    \n  }\n};\n</code></pre><!--more-->\n<p>补充好后，继续打开 <code>src/home/controller/index.js</code> 并增加如下内容：</p>\n<pre><code class=\"hljs lang-javascript\"><span class=\"hljs-meta\">\"use strict\"</span>;\n\n<span class=\"hljs-keyword\">import</span> Base <span class=\"hljs-keyword\">from</span> <span class=\"hljs-string\">\"./base.js\"</span>;\n<span class=\"hljs-keyword\">import</span> qiniu <span class=\"hljs-keyword\">from</span> <span class=\"hljs-string\">\"qiniu\"</span>;\n\n<span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">Base</span> </span>{\n  <span class=\"hljs-comment\">/**\n   * index action\n   * @return {Promise} []\n   */</span>\n  indexAction(){\n    <span class=\"hljs-keyword\">let</span> qconfig = <span class=\"hljs-keyword\">this</span>.config(<span class=\"hljs-string\">\"qiniu\"</span>);\n    <span class=\"hljs-keyword\">let</span> putPolicy = <span class=\"hljs-keyword\">new</span> qiniu.rs.PutPolicy( qconfig.bucket );\n    qiniu.conf.ACCESS_KEY = qconfig.access_key;\n    qiniu.conf.SECRET_KEY = qconfig.secret_key;\n\n    <span class=\"hljs-keyword\">this</span>.assign({\n      uptoken: putPolicy.token(),\n      baseUrl: qconfig.domain\n    });\n\n    <span class=\"hljs-keyword\">return</span> <span class=\"hljs-keyword\">this</span>.display();\n  }\n}\n</code></pre><p>七牛上传图片需要三个关键的东西，一个是根据 key 生成的密钥 token，一个是文件的名称，最后一个当然是文件。通过 <code>new qiniu.rs.PutPolicy(&lt;bucket&gt;).token()</code> 方法我们就可以直接获取到生成的密钥了。这里不得不吐槽一下 <code>qiniu.conf.ACCESS_KEY</code> 和 <code>qiniu.conf.SECRET_KEY</code> 这样的设定，直接在模块上增加属性我也是醉了。最后我们把生成好的 <code>uptoken</code> 和定义的空间域名传入到模板中就 OK 了！</p>\n<p>下面我们开始写我们的模板吧！模板的编写其实非常简单，清空 <code>view/home/index_index.html</code> 文件并添加如下代码：</p>\n<pre><code class=\"hljs lang-erb\"><span class=\"xml\"><span class=\"hljs-meta\">&lt;!DOCTYPE html&gt;</span>\n<span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">html</span>&gt;</span>\n<span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">head</span>&gt;</span>\n  <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">meta</span> <span class=\"hljs-attr\">charset</span>=<span class=\"hljs-string\">\"UTF-8\"</span>&gt;</span>\n  <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">title</span>&gt;</span>ThinkJS Qiniu Demo<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">title</span>&gt;</span>\n<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">head</span>&gt;</span>\n<span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">body</span>&gt;</span>\n  <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">form</span> <span class=\"hljs-attr\">method</span>=<span class=\"hljs-string\">\"post\"</span> <span class=\"hljs-attr\">action</span>=<span class=\"hljs-string\">\"http://upload.qiniu.com/\"</span>\n   <span class=\"hljs-attr\">enctype</span>=<span class=\"hljs-string\">\"multipart/form-data\"</span>&gt;</span>\n    <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">input</span> <span class=\"hljs-attr\">name</span>=<span class=\"hljs-string\">\"key\"</span> <span class=\"hljs-attr\">type</span>=<span class=\"hljs-string\">\"hidden\"</span> <span class=\"hljs-attr\">value</span>=<span class=\"hljs-string\">\"\"</span>&gt;</span>\n    <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">input</span> <span class=\"hljs-attr\">name</span>=<span class=\"hljs-string\">\"token\"</span> <span class=\"hljs-attr\">type</span>=<span class=\"hljs-string\">\"hidden\"</span> <span class=\"hljs-attr\">value</span>=<span class=\"hljs-string\">\"&lt;%=</span></span></span><span class=\"ruby\">uptoken</span><span class=\"xml\"><span class=\"hljs-tag\"><span class=\"hljs-string\">%&gt;\"</span>&gt;</span>\n    <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">input</span> <span class=\"hljs-attr\">name</span>=<span class=\"hljs-string\">\"file\"</span> <span class=\"hljs-attr\">type</span>=<span class=\"hljs-string\">\"file\"</span> <span class=\"hljs-attr\">required</span>/&gt;</span>\n    <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">button</span>&gt;</span>OK<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">button</span>&gt;</span>\n  <span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">form</span>&gt;</span>\n<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">body</span>&gt;</span>\n<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">html</span>&gt;</span>\n</span></code></pre><p>保存后我们访问 <a href=\"http://localhost:8360\">http://localhost:8360</a> 就可以进行测试了。选择图片并点击 OK 按钮后会提交文件到七牛的服务器上，七牛会返回类似一下内容的 JSON 字符串：</p>\n<pre><code class=\"hljs lang-json\">{<span class=\"hljs-attr\">\"hash\"</span>:<span class=\"hljs-string\">\"lqRwoZzfZ6_2QHand2ix6AITjOw_\"</span>,<span class=\"hljs-attr\">\"key\"</span>:<span class=\"hljs-string\">\"\"</span>}\n</code></pre><p>其中 key 就是我们七牛线上保存的文件名，将其与空间域名拼接后就能获取到文件的 URL 地址了。不过此时我们会发现 key 是空的，那是因为我们并没有上传 key，代表着文件名为空。解决办法是在表单提交之前获取 file 控件的值并拿到文件名。同时我们还会发现由于是表单上传所以页面会进行跳转，为了不进行跳转我们必须将表单提交替换为 AJAX 模拟表单提交。按照如下代码修改模板：</p>\n<pre><code class=\"hljs lang-xml\"><span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">form</span> <span class=\"hljs-attr\">method</span>=<span class=\"hljs-string\">\"post\"</span> <span class=\"hljs-attr\">action</span>=<span class=\"hljs-string\">\"http://upload.qiniu.com/\"</span>\n   <span class=\"hljs-attr\">enctype</span>=<span class=\"hljs-string\">\"multipart/form-data\"</span> <span class=\"hljs-attr\">onsubmit</span>=<span class=\"hljs-string\">\"return send();\"</span>&gt;</span>\n  <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">input</span> <span class=\"hljs-attr\">name</span>=<span class=\"hljs-string\">\"key\"</span> <span class=\"hljs-attr\">type</span>=<span class=\"hljs-string\">\"hidden\"</span> <span class=\"hljs-attr\">value</span>=<span class=\"hljs-string\">\"\"</span>&gt;</span>\n  <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">input</span> <span class=\"hljs-attr\">name</span>=<span class=\"hljs-string\">\"token\"</span> <span class=\"hljs-attr\">type</span>=<span class=\"hljs-string\">\"hidden\"</span> <span class=\"hljs-attr\">value</span>=<span class=\"hljs-string\">\"&lt;%=uptoken%&gt;\"</span>&gt;</span>\n  <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">input</span> <span class=\"hljs-attr\">name</span>=<span class=\"hljs-string\">\"file\"</span> <span class=\"hljs-attr\">type</span>=<span class=\"hljs-string\">\"file\"</span> <span class=\"hljs-attr\">required</span>/&gt;</span>\n  <span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">button</span>&gt;</span>OK<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">button</span>&gt;</span>\n<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">form</span>&gt;</span>\n<span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">script</span>&gt;</span><span class=\"javascript\">\n<span class=\"hljs-comment\">/** 设置 key 值为文件名 **/</span>\n<span class=\"hljs-function\"><span class=\"hljs-keyword\">function</span> <span class=\"hljs-title\">setKey</span>(<span class=\"hljs-params\"></span>) </span>{\n  <span class=\"hljs-keyword\">var</span> key = <span class=\"hljs-built_in\">document</span>.querySelector(<span class=\"hljs-string\">\"input[name=key]\"</span>);\n  <span class=\"hljs-keyword\">var</span> file = <span class=\"hljs-built_in\">document</span>.querySelector(<span class=\"hljs-string\">\"input[name=file]\"</span>);\n  <span class=\"hljs-keyword\">var</span> filename = file.value.match(<span class=\"hljs-regexp\">/[^\\/\\\\]+\\.\\w+$/</span>);\n  <span class=\"hljs-keyword\">if</span>( !filename[<span class=\"hljs-number\">0</span>] ) {\n    <span class=\"hljs-keyword\">return</span> <span class=\"hljs-literal\">false</span>;\n  }\n  key.value = filename[<span class=\"hljs-number\">0</span>];\n  <span class=\"hljs-keyword\">return</span> <span class=\"hljs-literal\">true</span>;\n}\n\n<span class=\"hljs-comment\">/** 提交表单上传图片 **/</span>\n<span class=\"hljs-function\"><span class=\"hljs-keyword\">function</span> <span class=\"hljs-title\">send</span>(<span class=\"hljs-params\"></span>) </span>{\n  <span class=\"hljs-keyword\">var</span> xhr = <span class=\"hljs-keyword\">new</span> XMLHttpRequest(), button = <span class=\"hljs-built_in\">document</span>.querySelector(<span class=\"hljs-string\">\"button\"</span>);\n  xhr.open(<span class=\"hljs-string\">\"POST\"</span>, <span class=\"hljs-string\">\"http://upload.qiniu.com\"</span>, <span class=\"hljs-literal\">true</span>);\n  xhr.onload = <span class=\"hljs-function\"><span class=\"hljs-keyword\">function</span>(<span class=\"hljs-params\"></span>) </span>{\n    button.removeAttribute(<span class=\"hljs-string\">\"disabled\"</span>);\n    button.innerText = <span class=\"hljs-string\">\"OK\"</span>;\n\n    <span class=\"hljs-keyword\">var</span> res = <span class=\"hljs-built_in\">JSON</span>.parse( xhr.responseText );\n    prompt(<span class=\"hljs-string\">\"你上传的文件地址是：\"</span>, <span class=\"hljs-string\">\"&lt;%=baseUrl%&gt;\"</span>+res.key);\n  }\n\n  button.setAttribute(<span class=\"hljs-string\">\"disabled\"</span>, <span class=\"hljs-string\">\"disabled\"</span>);\n  button.innerText = <span class=\"hljs-string\">\"正在上传中...\"</span>;\n\n  setKey();\n  xhr.send(<span class=\"hljs-keyword\">new</span> FormData(<span class=\"hljs-built_in\">document</span>.querySelector(<span class=\"hljs-string\">\"form\"</span>)));\n  <span class=\"hljs-keyword\">return</span> <span class=\"hljs-literal\">false</span>;\n}\n</span><span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">script</span>&gt;</span>\n</code></pre><p>动态设置文件名 key，增加 AJAX 表单提交，并在表单提交时修改按钮文字表示正在上传，上传结束之后弹窗提示用户文件的七牛地址。这样整个流程就完美了！本教程完整的示例代码可以从这里下载：<a href=\"http://pan.baidu.com/s/1i4vShCx\">百度云</a> | <a href=\"https://yunpan.cn/crZGIURYQpdjd\">云盘（提取码：4fd4）</a>。下载解压 <code>npm install</code> 之后直接 <code>npm start</code> 即可运行。</p>\n',1,'2016-02-25 21:20:36','2016-02-25 21:20:36',1);

/*!40000 ALTER TABLE `fk_post` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_post_cate
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_post_cate`;

CREATE TABLE `fk_post_cate` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int(11) NOT NULL,
  `cate_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_cate` (`post_id`,`cate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `fk_post_cate` WRITE;
/*!40000 ALTER TABLE `fk_post_cate` DISABLE KEYS */;

INSERT INTO `fk_post_cate` (`id`, `post_id`, `cate_id`)
VALUES
	(1,10,13),
	(2,10,14),
	(3,11,13),
	(4,11,14),
	(5,18,13);

/*!40000 ALTER TABLE `fk_post_cate` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_post_history
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_post_history`;

CREATE TABLE `fk_post_history` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int(11) DEFAULT NULL,
  `markdown_content` text CHARACTER SET utf8,
  `update_user_id` int(11) DEFAULT NULL COMMENT '更新用户的 ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



# Dump of table fk_post_tag
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_post_tag`;

CREATE TABLE `fk_post_tag` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_tag` (`post_id`,`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



# Dump of table fk_tag
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_tag`;

CREATE TABLE `fk_tag` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



# Dump of table fk_user
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_user`;

CREATE TABLE `fk_user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `display_name` varchar(255) DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `type` tinyint(11) NOT NULL DEFAULT '1' COMMENT '1 为管理员  2 为编辑',
  `email` varchar(255) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `status` tinyint(11) NOT NULL DEFAULT '1' COMMENT '1 为有效 2 为禁用',
  `create_time` datetime NOT NULL,
  `create_ip` varchar(20) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `last_login_time` datetime NOT NULL,
  `last_login_ip` varchar(20) CHARACTER SET utf8 NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `fk_user` WRITE;
/*!40000 ALTER TABLE `fk_user` DISABLE KEYS */;

INSERT INTO `fk_user` (`id`, `name`, `display_name`, `password`, `type`, `email`, `status`, `create_time`, `create_ip`, `last_login_time`, `last_login_ip`)
VALUES
	(2,'welefen','老六333wwwwww','1f071b63b5704e6edc2b2b76655ff833',1,'welefen@gmail.com',1,'2016-02-04 13:46:47','127.0.0.1','2016-02-04 17:24:03','127.0.0.1'),
	(3,'suredy','','dbba66743de48eb5021c6c43208abcc2',1,'suredy@163.com',1,'2016-02-04 15:10:55','127.0.0.1','2016-02-04 15:10:55','127.0.0.1'),
	(4,'suredy222','','995cb20b0da63a0dde179835d2486996',1,'suredy@1631.com',1,'2016-02-04 15:12:06','127.0.0.1','2016-02-04 15:12:06','127.0.0.1'),
	(5,'suredy4','','b73f4f879d1d8e9a1fd0f68effe9b44c',1,'suredy44@163.com',1,'2016-02-04 15:13:15','127.0.0.1','2016-02-04 15:13:15','127.0.0.1'),
	(6,'suredy5','suredy6','7b8f20f2f4b5e72b404a1e1ebdef9980',1,'fasdf@163.com',2,'2016-02-04 15:13:49','127.0.0.1','2016-02-04 17:26:14','127.0.0.1'),
	(7,'sfadsaf777','','c34e35db20be8061244ae0eba678455a',1,'fasdfsadf@163.com',1,'2016-02-04 15:14:17','127.0.0.1','2016-02-04 15:14:17','127.0.0.1'),
	(8,'fasdfasdf','','6765e1976fafd3984729aeb92561689f',1,'fasdfasfd@163.com',1,'2016-02-04 15:14:54','127.0.0.1','2016-02-04 15:14:54','127.0.0.1'),
	(9,'fasdfaswwww','','364b1b445ed82463f81158db29c218ec',1,'fasdfasdf@184.com',1,'2016-02-04 15:15:31','127.0.0.1','2016-02-04 15:15:31','127.0.0.1'),
	(10,'www898989uiu','','c15209e7dcf69701fdde386f86137e82',1,'fasdfsadwwwf@163.com',1,'2016-02-04 15:17:47','127.0.0.1','2016-02-04 15:17:47','127.0.0.1'),
	(11,'fwew','','c3d46bb90e2091a8b3acf715a8538329',2,'fasdwwwwwwwf@163.com',1,'2016-02-04 15:18:17','127.0.0.1','2016-02-23 10:17:35','127.0.0.1'),
	(12,'test0000','','9e1aa29be5561a86834816921d966e0b',1,'test000@163.com',1,'2016-02-04 15:35:08','127.0.0.1','2016-02-04 15:35:08','127.0.0.1'),
	(13,'test8888','test','9a3db46b7473a9177f976341d4693304',1,'welewerwerfen@gmail.com',1,'2016-02-04 15:35:53','127.0.0.1','2016-02-23 15:28:11','127.0.0.1'),
	(14,'ddddddd','welefen','81ca50c7046f32f62b9dbc54726f2aaa',1,'itchin2a110@gmail.com',1,'2016-02-04 17:20:57','127.0.0.1','2016-02-23 15:30:03','127.0.0.1');

/*!40000 ALTER TABLE `fk_user` ENABLE KEYS */;
UNLOCK TABLES;



/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
