# ************************************************************
# Sequel Pro SQL dump
# Version 4529
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 5.6.19-debug)
# Database: firekylin
# Generation Time: 2016-03-11 03:15:04 +0000
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
	(1,'fasdf',0,NULL),
	(2,'www.ueapp.com',0,NULL),
	(4,'www.ueapp.comd',0,NULL),
	(6,'www.ueapp.comwww',1,NULL),
	(7,'二级分类',1,''),
	(8,'www',0,'wwww');

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
	('comment','{\"type\": \"disqus\", \"name\": \"welefen\"}','评论类型'),
	('description','A Simple & Fast Node Bloging Platform Base On ThinkJS 2.0 & ReactJS & ES6/7','网站描述'),
	('github_blog','welefen/blog','GitHub blog 地址，如果填了则同步到 GitHub 上'),
	('github_url','https://github.com/75team/thinkjs','GitHub 地址'),
	('image_upload',NULL,'图片存放的位置，默认存在放网站上。也可以选择放在七牛或者又拍云等地方'),
	('keywords','www,fasdf,fasdfa','网站关键字'),
	('logo_url','/static/upload/201603/logo.jpg','logo 地址'),
	('miitbeian','we','网站备案号'),
	('num_per_page','10','文章一页显示的条数'),
	('password_salt','firekylin','密码 salt，网站安装的时候随机生成一个'),
	('theme','firekylin','主题名称'),
	('title','Firekylin 系统','网站标题'),
	('twitter_url','','微博地址'),
	('two_factor_auth','','是否开启二步验证');

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
  `summary` tinytext CHARACTER SET utf8 NOT NULL COMMENT '摘要',
  `markdown_content` text CHARACTER SET utf8 NOT NULL,
  `content` text CHARACTER SET utf8 NOT NULL,
  `allow_comment` tinyint(11) NOT NULL DEFAULT '1' COMMENT '1 为允许， 0 为不允许',
  `create_time` datetime NOT NULL,
  `update_time` datetime NOT NULL,
  `is_public` tinyint(11) NOT NULL DEFAULT '1' COMMENT '1 为公开，0 为不公开',
  `comment_num` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `fk_post` WRITE;
/*!40000 ALTER TABLE `fk_post` DISABLE KEYS */;

INSERT INTO `fk_post` (`id`, `user_id`, `type`, `status`, `title`, `pathname`, `summary`, `markdown_content`, `content`, `allow_comment`, `create_time`, `update_time`, `is_public`, `comment_num`)
VALUES
	(13,16,0,3,'Cache','cache','<p>在项目中，合理使用缓存对性能有很大的帮助。ThinkJS 提供了多种的缓存方式，包括：内存缓存、文件缓存、Memcache 缓存、Redis 缓存等。</p>\n','\n\n在项目中，合理使用缓存对性能有很大的帮助。ThinkJS 提供了多种的缓存方式，包括：内存缓存、文件缓存、Memcache 缓存、Redis 缓存等。\n\n<!--more-->\n\n### 缓存类型\n\n系统默认支持的缓存类型如下：\n\n* `memory` 内存缓存\n* `file` 文件缓存\n* `memcache` Memcache 缓存\n* `redis` Redis 缓存\n\n如果使用 `memcache` 缓存，需要设置 Memcache 配置信息，见 [配置](./config.html#memcache)。\n\n如果使用 `redis` 缓存，需要设置 Redis 配置信息，见 [配置](./config.html#redis)。\n\n### 缓存配置\n\n默认缓存配置如下，可以在配置文件 `src/common/config/cache.js` 中进行修改：\n\n```js\nexport default {\n  type: \'file\', //缓存类型\n  timeout: 6 * 3600, //失效时间，单位：秒\n  adapter: { //不同 adapter 下的配置\n    file: {\n      path: think.RUNTIME_PATH + \'/cache\', //缓存文件的根目录\n      path_depth: 2, //缓存文件生成子目录的深度\n      file_ext: \'.json\' //缓存文件的扩展名\n    },\n    redis: {\n      prefix: \'thinkjs_\'\n    },\n    memcache: {\n      prefix: \'thinkjs_\'\n    }\n  }\n};\n```\n\n`注`：`2.0.6` 版本开始添加了 adapter 配置。\n\n其中 `prefix` 在 `memcache` 和 `redis` 类型中使用，存储时会将缓存 key + prefix 作为新的 key 来存储，用于防止跟其他地方使用的缓存 key 冲突。如果不想设置 prefix，可以将 prefix 设置为空字符串，如：\n\n```js\nexport default {\n  prefix: \'\' //将缓存 key 前缀设置为空\n}\n```\n\n\n### 使用缓存\n\n可以通过 `think.cache` 方法对缓存进行增删改查操作，具体请见 [API -> think](./api_think.html#toc-7d7)。\n\n如果当前使用场景在继承自 think.http.base 的类下，可以通过 `this.cache` 方法来操作缓存，具体请见 [API -> think.http.base](.//api_think_http_base.html#cache-name-value-options)。\n\n\n### 扩展缓存\n\n可以通过下面的命令创建一个名为 `foo` 缓存类：\n\n```sh\nthinkjs adapter cache/foo\n```\n\n执行完成后，会创建文件 `src/common/adapter/cache/foo.js`。扩展缓存类需要实现如下的方法：\n\n```js\nexport default class extends think.cache.base {\n  /**\n   * 初始化方法\n   * @param  {Object} options []\n   * @return {}         []\n   */\n  init(options){\n    //set gc type & start gc\n    this.gcType = \'cache_foo\';\n    think.gc(this);\n  }\n  /**\n   * 获取缓存\n   * @param  {String} name []\n   * @return {Promise}      []\n   */\n  get(name){\n\n  }\n  /**\n   * 设置缓存\n   * @param {String} name    []\n   * @param {Mixed} value   []\n   * @param {Number} timeout []\n   * @return {Promise}\n   */\n  set(name, value, timeout){\n\n  }\n  /**\n   * 删除缓存\n   * @param  {String} name []\n   * @return {Promise}      []\n   */\n  delete(name){\n\n  }\n  /**\n   * 缓存垃圾回收\n   * @return {Promise} []\n   */\n  gc(){\n\n  }\n}\n```\n\n框架里的 Cache 实现请见 <https://github.com/75team/thinkjs/tree/master/src/adapter/cache>。\n\n### 使用第三方缓存 Adapter\n\n如何使用第三方的缓存 Adapter 请参见 [Adapter -> 介绍](./adapter_intro.html#toc-e7c)。\n','<p>在项目中，合理使用缓存对性能有很大的帮助。ThinkJS 提供了多种的缓存方式，包括：内存缓存、文件缓存、Memcache 缓存、Redis 缓存等。</p>\n<!--more-->\n<h3 id=\"toc-e54\"><a class=\"anchor\" href=\"#toc-e54\"></a>缓存类型</h3>\n<p>系统默认支持的缓存类型如下：</p>\n<ul>\n<li><code>memory</code> 内存缓存</li>\n<li><code>file</code> 文件缓存</li>\n<li><code>memcache</code> Memcache 缓存</li>\n<li><code>redis</code> Redis 缓存</li>\n</ul>\n<p>如果使用 <code>memcache</code> 缓存，需要设置 Memcache 配置信息，见 <a href=\"./config.html#memcache\">配置</a>。</p>\n<p>如果使用 <code>redis</code> 缓存，需要设置 Redis 配置信息，见 <a href=\"./config.html#redis\">配置</a>。</p>\n<h3 id=\"toc-ca1\"><a class=\"anchor\" href=\"#toc-ca1\"></a>缓存配置</h3>\n<p>默认缓存配置如下，可以在配置文件 <code>src/common/config/cache.js</code> 中进行修改：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> {\n  type: <span class=\"hljs-string\">\"file\"</span>, <span class=\"hljs-comment\">//缓存类型</span>\n  timeout: <span class=\"hljs-number\">6</span> * <span class=\"hljs-number\">3600</span>, <span class=\"hljs-comment\">//失效时间，单位：秒</span>\n  adapter: { <span class=\"hljs-comment\">//不同 adapter 下的配置</span>\n    file: {\n      path: think.RUNTIME_PATH + <span class=\"hljs-string\">\"/cache\"</span>, <span class=\"hljs-comment\">//缓存文件的根目录</span>\n      path_depth: <span class=\"hljs-number\">2</span>, <span class=\"hljs-comment\">//缓存文件生成子目录的深度</span>\n      file_ext: <span class=\"hljs-string\">\".json\"</span> <span class=\"hljs-comment\">//缓存文件的扩展名</span>\n    },\n    redis: {\n      prefix: <span class=\"hljs-string\">\"thinkjs_\"</span>\n    },\n    memcache: {\n      prefix: <span class=\"hljs-string\">\"thinkjs_\"</span>\n    }\n  }\n};\n</code></pre>\n<p><code>注</code>：<code>2.0.6</code> 版本开始添加了 adapter 配置。</p>\n<p>其中 <code>prefix</code> 在 <code>memcache</code> 和 <code>redis</code> 类型中使用，存储时会将缓存 key + prefix 作为新的 key 来存储，用于防止跟其他地方使用的缓存 key 冲突。如果不想设置 prefix，可以将 prefix 设置为空字符串，如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> {\n  prefix: <span class=\"hljs-string\">\"\"</span> <span class=\"hljs-comment\">//将缓存 key 前缀设置为空</span>\n}\n</code></pre>\n<h3 id=\"toc-28c\"><a class=\"anchor\" href=\"#toc-28c\"></a>使用缓存</h3>\n<p>可以通过 <code>think.cache</code> 方法对缓存进行增删改查操作，具体请见 <a href=\"./api_think.html#toc-7d7\">API -&gt; think</a>。</p>\n<p>如果当前使用场景在继承自 think.http.base 的类下，可以通过 <code>this.cache</code> 方法来操作缓存，具体请见 <a href=\".//api_think_http_base.html#cache-name-value-options\">API -&gt; think.http.base</a>。</p>\n<h3 id=\"toc-fb7\"><a class=\"anchor\" href=\"#toc-fb7\"></a>扩展缓存</h3>\n<p>可以通过下面的命令创建一个名为 <code>foo</code> 缓存类：</p>\n<pre><code class=\"hljs lang-undefined\">thinkjs adapter cache/foo\n</code></pre>\n<p>执行完成后，会创建文件 <code>src/common/adapter/cache/foo.js</code>。扩展缓存类需要实现如下的方法：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">cache</span>.<span class=\"hljs-title\">base</span> </span>{\n  <span class=\"hljs-comment\">/**\n   * 初始化方法\n   * @param  {Object} options []\n   * @return {}         []\n   */</span>\n  init(options){\n    <span class=\"hljs-comment\">//set gc type &amp; start gc</span>\n    <span class=\"hljs-keyword\">this</span>.gcType = <span class=\"hljs-string\">\"cache_foo\"</span>;\n    think.gc(<span class=\"hljs-keyword\">this</span>);\n  }\n  <span class=\"hljs-comment\">/**\n   * 获取缓存\n   * @param  {String} name []\n   * @return {Promise}      []\n   */</span>\n  get(name){\n\n  }\n  <span class=\"hljs-comment\">/**\n   * 设置缓存\n   * @param {String} name    []\n   * @param {Mixed} value   []\n   * @param {Number} timeout []\n   * @return {Promise}\n   */</span>\n  set(name, value, timeout){\n\n  }\n  <span class=\"hljs-comment\">/**\n   * 删除缓存\n   * @param  {String} name []\n   * @return {Promise}      []\n   */</span>\n  <span class=\"hljs-keyword\">delete</span>(name){\n\n  }\n  <span class=\"hljs-comment\">/**\n   * 缓存垃圾回收\n   * @return {Promise} []\n   */</span>\n  gc(){\n\n  }\n}\n</code></pre>\n<p>框架里的 Cache 实现请见 <a href=\"https://github.com/75team/thinkjs/tree/master/src/adapter/cache\">https://github.com/75team/thinkjs/tree/master/src/adapter/cache</a>。</p>\n<h3 id=\"toc-2fe\"><a class=\"anchor\" href=\"#toc-2fe\"></a>使用第三方缓存 Adapter</h3>\n<p>如何使用第三方的缓存 Adapter 请参见 <a href=\"./adapter_intro.html#toc-e7c\">Adapter -&gt; 介绍</a>。</p>\n',1,'2016-02-28 13:39:36','2016-03-03 15:04:44',1,0),
	(14,16,0,3,'定时任务','crontab','<p>项目在线上运行时，经常要定时去执行某个功能，这时候就需要使用定时任务来处理了。ThinkJS 支持命令行方式调用，结合系统的 crontab 功能可以很好的支持定时任务。</p>\n','\n\n项目在线上运行时，经常要定时去执行某个功能，这时候就需要使用定时任务来处理了。ThinkJS 支持命令行方式调用，结合系统的 crontab 功能可以很好的支持定时任务。\n\n<!--more-->\n\n### 命令行执行\n\nThinkJS 除了支持通过 URL 访问来执行外，还可以通过命令行的方式调用执行。使用方式如下：\n\n```sh\nnode www/production.js home/index/index\n```\n\n上面的命令表示执行 `home` 模块下 `index` Controller 里的 indexAction。\n\n##### 携带参数\n\n如果需要加参数，只要在后面加上对应的参数即可：\n\n```sh\nnode www/production.js home/index/index?name=thinkjs\n```\n\nAction 里就可以通过 `this.get` 方法来获取参数 `name` 了。\n\n##### 修改请求方法\n\n命令行执行默认的请求类型是 GET，如果想改为其他的类型，可以用下面的方法：\n\n```sh\nnode www/production.js url=home/index/index&method=post\n```\n\n这样就把请求类型改为了 post。但这种方式下，参数 url 的值里就不能包含 & 字符了（可以通过 / 的方式指定参数，如`node www/production.js url=home/index/index/foo/bar&method=post`）。\n\n除了修改请求类型，还可以修改下面的参数：\n\n* `host` 修改请求的 host 默认为 127.0.0.1\n* `ip` 修改请求的 ip 默认为 127.0.0.1\n\n##### 修改 header\n\n有时候如果想修改更多的 headers，可以传一个完整的 json 数据，如：\n\n```sh\nnode www/production.js {\"url\":\"/index/index\",\"ip\":\"127.0.0.1\",\"method\":\"POST\",\"headers\":{\"xxx\":\"yyyy\"}}\n```\n\n##### 禁止 URL 访问\n\n默认情况下，命令行执行的 Action 通过 URL 也可以访问到。如果禁止 URL 访问到该 Action，可以通过 `this.isCli` 来判断。如：\n\n```js\nexport default class extends think.controller.base {\n  indexAction(){\n    //禁止 URL 访问该 Action\n    if(!this.isCli()){\n      this.fail(\'only invoked in cli mode\');\n    }\n    ...\n  }\n}\n```\n\n### 执行脚本\n\n可以创建一个简单的执行脚本来调用命令行执行，如：\n\n```sh\ncd project_path; \nnode www/production.js home/index/index;\n```\n\n在项目目录下创建目录 `crontab`，将上面执行脚本存为一个文件放在该目录下。\n\n### 定时执行\n\n借助系统里的 crontab 可以做到定时执行，通过命令 `crontab -e` 来编辑定时任务，如：\n\n```sh\n0 */1 * * * /bin/sh project_path/crontab/a.sh # 1 小时执行一次\n```\n\n### 使用 node-crontab 模块执行定时任务\n\n除了使用 crontab 和命令行联合执行定时任务外，也可以使用 `node-crontab` 模块执行定时任务。如：\n\n```js\nimport crontab from \'node-crontab\';\n// 1 小时执行一次\nlet jobId = crontab.scheduleJob(\'0 */1 * * *\', () => {\n  \n});\n```\n\n将上面代码文件存放在 `src/common/bootstrap` 目录下，这样可以在服务启动时自动执行。\n\n如果希望在开发环境下能立即看下执行的效果，可以用类似下面的方式：\n\n```js\nimport crontab from \'node-crontab\';\n\nlet fn = () => {\n  //定时任务具体逻辑\n  //调用一个 Action\n  think.http(\'/home/image/spider\', true); //模拟访问 /home/image/spier\n}\n// 1 小时执行一次\nlet jobId = crontab.scheduleJob(\'0 */1 * * *\', fn);\n//开发环境下立即执行一次看效果\nif(think.env === \'development\'){\n  fn();\n}\n```\n','<p>项目在线上运行时，经常要定时去执行某个功能，这时候就需要使用定时任务来处理了。ThinkJS 支持命令行方式调用，结合系统的 crontab 功能可以很好的支持定时任务。</p>\n<!--more-->\n<h3 id=\"toc-f45\"><a class=\"anchor\" href=\"#toc-f45\"></a>命令行执行</h3>\n<p>ThinkJS 除了支持通过 URL 访问来执行外，还可以通过命令行的方式调用执行。使用方式如下：</p>\n<pre><code class=\"hljs lang-undefined\">node www/production.js home/index/index\n</code></pre>\n<p>上面的命令表示执行 <code>home</code> 模块下 <code>index</code> Controller 里的 indexAction。</p>\n<h5 id=\"toc-186\"><a class=\"anchor\" href=\"#toc-186\"></a>携带参数</h5>\n<p>如果需要加参数，只要在后面加上对应的参数即可：</p>\n<pre><code class=\"hljs lang-undefined\">node www/production.js home/index/index?name=thinkjs\n</code></pre>\n<p>Action 里就可以通过 <code>this.get</code> 方法来获取参数 <code>name</code> 了。</p>\n<h5 id=\"toc-278\"><a class=\"anchor\" href=\"#toc-278\"></a>修改请求方法</h5>\n<p>命令行执行默认的请求类型是 GET，如果想改为其他的类型，可以用下面的方法：</p>\n<pre><code class=\"hljs lang-undefined\">node www/production.js url=home/index/index&amp;method=post\n</code></pre>\n<p>这样就把请求类型改为了 post。但这种方式下，参数 url 的值里就不能包含 &amp; 字符了（可以通过 / 的方式指定参数，如<code>node www/production.js url=home/index/index/foo/bar&amp;method=post</code>）。</p>\n<p>除了修改请求类型，还可以修改下面的参数：</p>\n<ul>\n<li><code>host</code> 修改请求的 host 默认为 127.0.0.1</li>\n<li><code>ip</code> 修改请求的 ip 默认为 127.0.0.1</li>\n</ul>\n<h5 id=\"toc-3c8\"><a class=\"anchor\" href=\"#toc-3c8\"></a>修改 header</h5>\n<p>有时候如果想修改更多的 headers，可以传一个完整的 json 数据，如：</p>\n<pre><code class=\"hljs lang-sh\">node www/production.js {<span class=\"hljs-string\">\"url\"</span>:<span class=\"hljs-string\">\"/index/index\"</span>,<span class=\"hljs-string\">\"ip\"</span>:<span class=\"hljs-string\">\"127.0.0.1\"</span>,<span class=\"hljs-string\">\"method\"</span>:<span class=\"hljs-string\">\"POST\"</span>,<span class=\"hljs-string\">\"headers\"</span>:{<span class=\"hljs-string\">\"xxx\"</span>:<span class=\"hljs-string\">\"yyyy\"</span>}}\n</code></pre>\n<h5 id=\"toc-eb9\"><a class=\"anchor\" href=\"#toc-eb9\"></a>禁止 URL 访问</h5>\n<p>默认情况下，命令行执行的 Action 通过 URL 也可以访问到。如果禁止 URL 访问到该 Action，可以通过 <code>this.isCli</code> 来判断。如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">controller</span>.<span class=\"hljs-title\">base</span> </span>{\n  indexAction(){\n    <span class=\"hljs-comment\">//禁止 URL 访问该 Action</span>\n    <span class=\"hljs-keyword\">if</span>(!<span class=\"hljs-keyword\">this</span>.isCli()){\n      <span class=\"hljs-keyword\">this</span>.fail(<span class=\"hljs-string\">\"only invoked in cli mode\"</span>);\n    }\n    ...\n  }\n}\n</code></pre>\n<h3 id=\"toc-8c4\"><a class=\"anchor\" href=\"#toc-8c4\"></a>执行脚本</h3>\n<p>可以创建一个简单的执行脚本来调用命令行执行，如：</p>\n<pre><code class=\"hljs lang-sh\"><span class=\"hljs-built_in\">cd</span> project_path; \nnode www/production.js home/index/index;\n</code></pre>\n<p>在项目目录下创建目录 <code>crontab</code>，将上面执行脚本存为一个文件放在该目录下。</p>\n<h3 id=\"toc-dae\"><a class=\"anchor\" href=\"#toc-dae\"></a>定时执行</h3>\n<p>借助系统里的 crontab 可以做到定时执行，通过命令 <code>crontab -e</code> 来编辑定时任务，如：</p>\n<pre><code class=\"hljs lang-sh\">0 */1 * * * /bin/sh project_path/crontab/a.sh <span class=\"hljs-comment\"># 1 小时执行一次</span>\n</code></pre>\n<h3 id=\"toc-962\"><a class=\"anchor\" href=\"#toc-962\"></a>使用 node-crontab 模块执行定时任务</h3>\n<p>除了使用 crontab 和命令行联合执行定时任务外，也可以使用 <code>node-crontab</code> 模块执行定时任务。如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">import</span> crontab <span class=\"hljs-keyword\">from</span> <span class=\"hljs-string\">\"node-crontab\"</span>;\n<span class=\"hljs-comment\">// 1 小时执行一次</span>\n<span class=\"hljs-keyword\">let</span> jobId = crontab.scheduleJob(<span class=\"hljs-string\">\"0 */1 * * *\"</span>, () =&gt; {\n\n});\n</code></pre>\n<p>将上面代码文件存放在 <code>src/common/bootstrap</code> 目录下，这样可以在服务启动时自动执行。</p>\n<p>如果希望在开发环境下能立即看下执行的效果，可以用类似下面的方式：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">import</span> crontab <span class=\"hljs-keyword\">from</span> <span class=\"hljs-string\">\"node-crontab\"</span>;\n\n<span class=\"hljs-keyword\">let</span> fn = () =&gt; {\n  <span class=\"hljs-comment\">//定时任务具体逻辑</span>\n  <span class=\"hljs-comment\">//调用一个 Action</span>\n  think.http(<span class=\"hljs-string\">\"/home/image/spider\"</span>, <span class=\"hljs-literal\">true</span>); <span class=\"hljs-comment\">//模拟访问 /home/image/spier</span>\n}\n<span class=\"hljs-comment\">// 1 小时执行一次</span>\n<span class=\"hljs-keyword\">let</span> jobId = crontab.scheduleJob(<span class=\"hljs-string\">\"0 */1 * * *\"</span>, fn);\n<span class=\"hljs-comment\">//开发环境下立即执行一次看效果</span>\n<span class=\"hljs-keyword\">if</span>(think.env === <span class=\"hljs-string\">\"development\"</span>){\n  fn();\n}\n</code></pre>\n',1,'2016-01-28 14:13:38','2016-02-28 14:13:38',1,0),
	(15,16,0,3,'MongoDB','MongoDB','<p>ThinkJS 支持使用 MongoDB 数据库，底层使用 <a href=\"https://www.npmjs.com/package/mongodb\">mongodb</a> 模块。</p>\n','\n\nThinkJS 支持使用 MongoDB 数据库，底层使用 [mongodb](https://www.npmjs.com/package/mongodb) 模块。ThinkJS 支持使用 MongoDB 数据库，底层使用 [mongodb](https://www.npmjs.com/package/mongodb) 模块。ThinkJS 支持使用 MongoDB 数据库，底层使用 [mongodb](https://www.npmjs.com/package/mongodb) 模块。ThinkJS 支持使用 MongoDB 数据库，底层使用 [mongodb](https://www.npmjs.com/package/mongodb) 模块。ThinkJS 支持使用 MongoDB 数据库，底层使用 [mongodb](https://www.npmjs.com/package/mongodb) 模块。ThinkJS 支持使用 MongoDB 数据库，底层使用 [mongodb](https://www.npmjs.com/package/mongodb) 模块。ThinkJS 支持使用 MongoDB 数据库，底层使用 [mongodb](https://www.npmjs.com/package/mongodb) 模块。ThinkJS 支持使用 MongoDB 数据库，底层使用 [mongodb](https://www.npmjs.com/package/mongodb) 模块。\n\n\n<!--more-->\n\n\n### 配置\n\n使用 MongoDB 数据库，需要将模型中的配置 `type` 改为 `mongo`，修改配置文件 `src/common/config/db.js`：\n\n```js\nexport default {\n  type: \'mongo\'\n}\n```\n\n#### 多 HOST\n\n可以将配置里的 `host` 字段设置为数据支持多 host 的功能，如：\n\n```js\nexport default {\n  type: \'mongo\',\n  adapter: {\n    mongo: {\n      host: [\'10.0.0.1\', \'10.0.0.2\'],\n      port: [\'1234\', \'5678\']\n    }\n  }\n}\n```\n\n`注`：此配置项在 `2.0.14` 版本中支持。\n\n#### 配置选项\n\n如果要在连接 MongoDB 服务的时候添加额外的参数，可以通过在 `options` 里追加，如：\n\n```js\nexport default {\n  type: \'mongo\',\n  adapter: {\n    mongo: {\n      options: {\n        authSource: \'admin\',\n        replicaSet: \'xxx\'\n      }\n    }\n  }\n}\n```\n\n上面的配置后，连接 MongoDB 的 URL 变成类似于 `mongodb://127.0.0.1:27017/?authSource=admin&replicaSet=xxx`。\n\n更多额外的配置请见 <http://mongodb.github.io/node-mongodb-native/2.0/reference/connecting/connection-settings/>。\n\n### 创建模型\n\n可以通过命令 `thinkjs model [name] --mongo` 来创建模型，如：\n\n```js\nthinkjs model user --mongo\n```\n\n执行完成后，会创建文件 `src/common/model/user.js`。如果想创建在其他模块下，需要带上具体的模块名。如：\n\n```js\nthinkjs model home/user --mongo\n```\n\n会在 `home` 模块下创建模型文件，文件为 `src/home/model/user.js`。\n\n### 模型继承\n\n模型需要继承 `think.model.mongo` 类，如果当前类不是继承该类，需要手动修改。\n\n#### ES6 语法\n\n```js\nexport default class extends think.model.mongo {\n\n}\n```\n\n#### 动态创建类的方式\n\n```js\nmodule.exports = think.model(\'mongo\', {\n  \n})\n```\n\n### CRUD 操作\n\nCRUD 操作和 Mysql 中接口相同，具体请见 [模型 -> 介绍](./model_intro.html#toc-d84)。\n\n### 创建索引\n\nmongo 模型可以配置索引，在增删改查操作之前模型会自动去创建索引，配置放在 `indexes` 属性里。如：\n\n```js\nexport default class extends think.model.mongo {\n  init(...args){\n    super.init(...args);\n    //配置索引\n    this.indexes = { \n\n    }\n  }\n}\n```\n\n#### 单字段索引\n```js\nexport default class extends think.model.mongo {\n  init(...args){\n    super.init(...args);\n    //配置索引\n    this.indexes = { \n      name: 1\n    }\n  }\n}\n```\n\n#### 唯一索引\n\n通过 `$unique` 来指定为唯一索引，如：\n\n```js\nexport default class extends think.model.mongo {\n  init(...args){\n    super.init(...args);\n    //配置索引\n    this.indexes = { \n      name: {$unique: 1}\n    }\n  }\n}\n```\n\n#### 多字段索引\n\n可以将多个字段联合索引，如：\n\n```js\nexport default class extends think.model.mongo {\n  init(...args){\n    super.init(...args);\n    //配置索引\n    this.indexes = { \n      email: 1\n      test: {\n        name: 1,\n        title: 1,\n        $unique: 1\n      }\n    }\n  }\n}\n```\n\n### 获取索引\n\n可以通过方法 `getIndexes` 获取创建的索引。如：\n\n```js\nexport default class extends think.controller.base {\n  async indexAction(){\n    let model = this.model(\'user\');\n    let indexes = await model.getIndexes();\n  }\n}\n```\n\n### aggregate\n\n可以通过 `aggregate` 方法进行混合操作。如：\n\n```js\nexport default class extends think.model.mongo {\n  match(){\n    return this.aggregate([\n      {$match: {status: \'A\'}},\n      {$group: {_id: \"$cust_id\", total: {$sum: \"$amount\"}}}\n    ]);\n  }\n}\n```\n\n具体请见 <https://docs.mongodb.org/manual/core/aggregation-introduction/>。\n\n### MapReduce\n\n可以通过 `mapReduce` 方法进行 MapReduce 操作。如：\n\n```js\nexport default class extends think.model.mongo {\n  execMapReduce(){\n    let map = () => {\n      emit(this.cust_id, this.amount);\n    }\n    let reduce = (key, values) => {\n      return Array.sum(values);\n    }\n    return this.mapReduce(map, reduce, {\n      query: {status: \"A\"},\n      out: \"order_totals\"\n    })\n  }\n}\n```\n\n具体请见 <https://docs.mongodb.org/manual/core/aggregation-introduction/#map-reduce>。','<p>ThinkJS 支持使用 MongoDB 数据库，底层使用 <a href=\"https://www.npmjs.com/package/mongodb\">mongodb</a> 模块。</p>\n<!--more-->\n<h3 id=\"toc-665\"><a class=\"anchor\" href=\"#toc-665\"></a>配置</h3>\n<p>使用 MongoDB 数据库，需要将模型中的配置 <code>type</code> 改为 <code>mongo</code>，修改配置文件 <code>src/common/config/db.js</code>：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> {\n  type: <span class=\"hljs-string\">\"mongo\"</span>\n}\n</code></pre>\n<h4 id=\"toc-727\"><a class=\"anchor\" href=\"#toc-727\"></a>多 HOST</h4>\n<p>可以将配置里的 <code>host</code> 字段设置为数据支持多 host 的功能，如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> {\n  type: <span class=\"hljs-string\">\"mongo\"</span>,\n  adapter: {\n    mongo: {\n      host: [<span class=\"hljs-string\">\"10.0.0.1\"</span>, <span class=\"hljs-string\">\"10.0.0.2\"</span>],\n      port: [<span class=\"hljs-string\">\"1234\"</span>, <span class=\"hljs-string\">\"5678\"</span>]\n    }\n  }\n}\n</code></pre>\n<p><code>注</code>：此配置项在 <code>2.0.14</code> 版本中支持。</p>\n<h4 id=\"toc-6f5\"><a class=\"anchor\" href=\"#toc-6f5\"></a>配置选项</h4>\n<p>如果要在连接 MongoDB 服务的时候添加额外的参数，可以通过在 <code>options</code> 里追加，如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> {\n  type: <span class=\"hljs-string\">\"mongo\"</span>,\n  adapter: {\n    mongo: {\n      options: {\n        authSource: <span class=\"hljs-string\">\"admin\"</span>,\n        replicaSet: <span class=\"hljs-string\">\"xxx\"</span>\n      }\n    }\n  }\n}\n</code></pre>\n<p>上面的配置后，连接 MongoDB 的 URL 变成类似于 <code>mongodb://127.0.0.1:27017/?authSource=admin&amp;replicaSet=xxx</code>。</p>\n<p>更多额外的配置请见 <a href=\"http://mongodb.github.io/node-mongodb-native/2.0/reference/connecting/connection-settings/\">http://mongodb.github.io/node-mongodb-native/2.0/reference/connecting/connection-settings/</a>。</p>\n<h3 id=\"toc-6bc\"><a class=\"anchor\" href=\"#toc-6bc\"></a>创建模型</h3>\n<p>可以通过命令 <code>thinkjs model [name] --mongo</code> 来创建模型，如：</p>\n<pre><code class=\"hljs lang-undefined\">thinkjs model user --mongo\n</code></pre>\n<p>执行完成后，会创建文件 <code>src/common/model/user.js</code>。如果想创建在其他模块下，需要带上具体的模块名。如：</p>\n<pre><code class=\"hljs lang-undefined\">thinkjs model home/user --mongo\n</code></pre>\n<p>会在 <code>home</code> 模块下创建模型文件，文件为 <code>src/home/model/user.js</code>。</p>\n<h3 id=\"toc-9b1\"><a class=\"anchor\" href=\"#toc-9b1\"></a>模型继承</h3>\n<p>模型需要继承 <code>think.model.mongo</code> 类，如果当前类不是继承该类，需要手动修改。</p>\n<h4 id=\"toc-75b\"><a class=\"anchor\" href=\"#toc-75b\"></a>ES6 语法</h4>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">model</span>.<span class=\"hljs-title\">mongo</span> </span>{\n\n}\n</code></pre>\n<h4 id=\"toc-a74\"><a class=\"anchor\" href=\"#toc-a74\"></a>动态创建类的方式</h4>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-built_in\">module</span>.exports = think.model(<span class=\"hljs-string\">\"mongo\"</span>, {\n\n})\n</code></pre>\n<h3 id=\"toc-01d\"><a class=\"anchor\" href=\"#toc-01d\"></a>CRUD 操作</h3>\n<p>CRUD 操作和 Mysql 中接口相同，具体请见 <a href=\"./model_intro.html#toc-d84\">模型 -&gt; 介绍</a>。</p>\n<h3 id=\"toc-0c6\"><a class=\"anchor\" href=\"#toc-0c6\"></a>创建索引</h3>\n<p>mongo 模型可以配置索引，在增删改查操作之前模型会自动去创建索引，配置放在 <code>indexes</code> 属性里。如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">model</span>.<span class=\"hljs-title\">mongo</span> </span>{\n  init(...args){\n    <span class=\"hljs-keyword\">super</span>.init(...args);\n    <span class=\"hljs-comment\">//配置索引</span>\n    <span class=\"hljs-keyword\">this</span>.indexes = { \n\n    }\n  }\n}\n</code></pre>\n<h4 id=\"toc-ebf\"><a class=\"anchor\" href=\"#toc-ebf\"></a>单字段索引</h4>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">model</span>.<span class=\"hljs-title\">mongo</span> </span>{\n  init(...args){\n    <span class=\"hljs-keyword\">super</span>.init(...args);\n    <span class=\"hljs-comment\">//配置索引</span>\n    <span class=\"hljs-keyword\">this</span>.indexes = { \n      name: <span class=\"hljs-number\">1</span>\n    }\n  }\n}\n</code></pre>\n<h4 id=\"toc-91a\"><a class=\"anchor\" href=\"#toc-91a\"></a>唯一索引</h4>\n<p>通过 <code>$unique</code> 来指定为唯一索引，如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">model</span>.<span class=\"hljs-title\">mongo</span> </span>{\n  init(...args){\n    <span class=\"hljs-keyword\">super</span>.init(...args);\n    <span class=\"hljs-comment\">//配置索引</span>\n    <span class=\"hljs-keyword\">this</span>.indexes = { \n      name: {$unique: <span class=\"hljs-number\">1</span>}\n    }\n  }\n}\n</code></pre>\n<h4 id=\"toc-734\"><a class=\"anchor\" href=\"#toc-734\"></a>多字段索引</h4>\n<p>可以将多个字段联合索引，如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">model</span>.<span class=\"hljs-title\">mongo</span> </span>{\n  init(...args){\n    <span class=\"hljs-keyword\">super</span>.init(...args);\n    <span class=\"hljs-comment\">//配置索引</span>\n    <span class=\"hljs-keyword\">this</span>.indexes = { \n      email: <span class=\"hljs-number\">1</span>\n      test: {\n        name: <span class=\"hljs-number\">1</span>,\n        title: <span class=\"hljs-number\">1</span>,\n        $unique: <span class=\"hljs-number\">1</span>\n      }\n    }\n  }\n}\n</code></pre>\n<h3 id=\"toc-d72\"><a class=\"anchor\" href=\"#toc-d72\"></a>获取索引</h3>\n<p>可以通过方法 <code>getIndexes</code> 获取创建的索引。如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">controller</span>.<span class=\"hljs-title\">base</span> </span>{\n  <span class=\"hljs-keyword\">async</span> indexAction(){\n    <span class=\"hljs-keyword\">let</span> model = <span class=\"hljs-keyword\">this</span>.model(<span class=\"hljs-string\">\"user\"</span>);\n    <span class=\"hljs-keyword\">let</span> indexes = <span class=\"hljs-keyword\">await</span> model.getIndexes();\n  }\n}\n</code></pre>\n<h3 id=\"aggregate\"><a class=\"anchor\" href=\"#aggregate\"></a>aggregate</h3>\n<p>可以通过 <code>aggregate</code> 方法进行混合操作。如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">model</span>.<span class=\"hljs-title\">mongo</span> </span>{\n  match(){\n    <span class=\"hljs-keyword\">return</span> <span class=\"hljs-keyword\">this</span>.aggregate([\n      {$match: {status: <span class=\"hljs-string\">\"A\"</span>}},\n      {$group: {_id: <span class=\"hljs-string\">\"$cust_id\"</span>, total: {$sum: <span class=\"hljs-string\">\"$amount\"</span>}}}\n    ]);\n  }\n}\n</code></pre>\n<p>具体请见 <a href=\"https://docs.mongodb.org/manual/core/aggregation-introduction/\">https://docs.mongodb.org/manual/core/aggregation-introduction/</a>。</p>\n<h3 id=\"mapreduce\"><a class=\"anchor\" href=\"#mapreduce\"></a>MapReduce</h3>\n<p>可以通过 <code>mapReduce</code> 方法进行 MapReduce 操作。如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">model</span>.<span class=\"hljs-title\">mongo</span> </span>{\n  execMapReduce(){\n    <span class=\"hljs-keyword\">let</span> map = () =&gt; {\n      emit(<span class=\"hljs-keyword\">this</span>.cust_id, <span class=\"hljs-keyword\">this</span>.amount);\n    }\n    <span class=\"hljs-keyword\">let</span> reduce = (key, values) =&gt; {\n      <span class=\"hljs-keyword\">return</span> <span class=\"hljs-built_in\">Array</span>.sum(values);\n    }\n    <span class=\"hljs-keyword\">return</span> <span class=\"hljs-keyword\">this</span>.mapReduce(map, reduce, {\n      query: {status: <span class=\"hljs-string\">\"A\"</span>},\n      out: <span class=\"hljs-string\">\"order_totals\"</span>\n    })\n  }\n}\n</code></pre>\n<p>具体请见 <a href=\"https://docs.mongodb.org/manual/core/aggregation-introduction/#map-reduce\">https://docs.mongodb.org/manual/core/aggregation-introduction/#map-reduce</a>。</p>\n',1,'2016-02-28 14:14:15','2016-03-02 11:31:08',1,0),
	(16,16,0,3,'Service','Service','<p>有时候项目里需要调用一些第三方的服务，如：调用 Github 相关接口。如果直接在 controller 里直接调用这些接口，一方面导致 controller 代码比较复杂，另一方面也不能更多进行代码复用。</p>\n<p','\n\n有时候项目里需要调用一些第三方的服务，如：调用 Github 相关接口。如果直接在 controller 里直接调用这些接口，一方面导致 controller 代码比较复杂，另一方面也不能更多进行代码复用。\n\n对于这些情况，可以包装成 service 供 controller 里调用。\n\n<!--more-->\n\n### 创建 service\n\n可以通过命令 `thinkjs service [name]` 来创建命令，具体使用请见 [扩展功能 -> ThinkJS 命令 -> 添加 service](./thinkjs_command.html#添加-service)。\n\n默认生成的 service 是一个 class，但有些 service 直接提供一些静态方法即可，这时候可以把 class 改为对象即可。\n\n### 加载 service\n\n可以通过 `think.service` 加载一个 service，如：\n\n```js\nexport default class extends think.controller.base {\n  indexAction(){\n    let GithubService = think.service(\'github\');\n    let instance = new GithubService();\n  }\n}\n```\n\n如果想跨模块加载 service，可以通过下面的方式：\n\n```js\nexport default class extends think.controller.base {\n  indexAction(){\n    let GithubService = think.service(\'github\', \'admin\'); //加载 admin 模块下的 github service\n    let instance = new GithubService();\n  }\n}\n```\n\n`注`：如果项目不是特别复杂，建议把 service 放在 `common` 模块下，可以就都可以方便的加载了。','<p>有时候项目里需要调用一些第三方的服务，如：调用 Github 相关接口。如果直接在 controller 里直接调用这些接口，一方面导致 controller 代码比较复杂，另一方面也不能更多进行代码复用。</p>\n<p>对于这些情况，可以包装成 service 供 controller 里调用。</p>\n<!--more-->\n<h3 id=\"toc-b9d\"><a class=\"anchor\" href=\"#toc-b9d\"></a>创建 service</h3>\n<p>可以通过命令 <code>thinkjs service [name]</code> 来创建命令，具体使用请见 <a href=\"./thinkjs_command.html#添加-service\">扩展功能 -&gt; ThinkJS 命令 -&gt; 添加 service</a>。</p>\n<p>默认生成的 service 是一个 class，但有些 service 直接提供一些静态方法即可，这时候可以把 class 改为对象即可。</p>\n<h3 id=\"toc-456\"><a class=\"anchor\" href=\"#toc-456\"></a>加载 service</h3>\n<p>可以通过 <code>think.service</code> 加载一个 service，如：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">controller</span>.<span class=\"hljs-title\">base</span> </span>{\n  indexAction(){\n    <span class=\"hljs-keyword\">let</span> GithubService = think.service(<span class=\"hljs-string\">\"github\"</span>);\n    <span class=\"hljs-keyword\">let</span> instance = <span class=\"hljs-keyword\">new</span> GithubService();\n  }\n}\n</code></pre>\n<p>如果想跨模块加载 service，可以通过下面的方式：</p>\n<pre><code class=\"hljs lang-js\"><span class=\"hljs-keyword\">export</span> <span class=\"hljs-keyword\">default</span> <span class=\"hljs-class\"><span class=\"hljs-keyword\">class</span> <span class=\"hljs-keyword\">extends</span> <span class=\"hljs-title\">think</span>.<span class=\"hljs-title\">controller</span>.<span class=\"hljs-title\">base</span> </span>{\n  indexAction(){\n    <span class=\"hljs-keyword\">let</span> GithubService = think.service(<span class=\"hljs-string\">\"github\"</span>, <span class=\"hljs-string\">\"admin\"</span>); <span class=\"hljs-comment\">//加载 admin 模块下的 github service</span>\n    <span class=\"hljs-keyword\">let</span> instance = <span class=\"hljs-keyword\">new</span> GithubService();\n  }\n}\n</code></pre>\n<p><code>注</code>：如果项目不是特别复杂，建议把 service 放在 <code>common</code> 模块下，可以就都可以方便的加载了。</p>\n',1,'2016-02-28 14:14:36','2016-03-02 17:39:42',1,0),
	(19,16,0,0,'www','fasdfasdf','<p>fasdfadf</p>\n','fasdfadf','<p>fasdfadf</p>\n',1,'2016-03-02 17:40:57','2016-03-02 17:40:57',1,0),
	(20,16,0,3,'www','wwwwww','<p>www</p>\n','www','<p>www</p>\n',1,'2016-03-03 09:18:17','2016-03-03 09:18:25',1,0),
	(21,16,0,3,'www','www','<p>www</p>\n','www','<p>www</p>\n',1,'2016-03-03 09:20:35','2016-03-03 09:20:35',1,0),
	(22,16,1,3,'友情链接','links','<ul>\n<li>dddd1. 有序列表项0</li>\n<li>有序列表项1</li>\n</ul>\n','* dddd1. 有序列表项0\n2. 有序列表项1','<ul>\n<li>dddd1. 有序列表项0</li>\n<li>有序列表项1</li>\n</ul>\n',1,'2016-03-03 09:35:17','2016-03-03 14:05:17',1,0),
	(23,16,1,3,'www','about','<p>fasdfasdf</p>\n','fasdfasdf','<p>fasdfasdf</p>\n',1,'2016-03-03 16:18:50','2016-03-03 16:18:50',1,0),
	(24,16,0,3,'test','fas','<p>fasdfasdf</p>\n','fasdfasdf','<p>fasdfasdf</p>\n',1,'2016-03-03 16:21:12','2016-03-03 16:21:12',1,0),
	(25,16,0,3,'wwwerwe','faadf','<p>fasdfasdf</p>\n','fasdfasdf','<p>fasdfasdf</p>\n',1,'2016-03-03 16:21:19','2016-03-03 16:21:19',1,0),
	(26,16,0,3,'fasdfasdfasdf','asdf','<p>adsfadfadsf\nf\nasd\nfas\ndf\nads\nfa\nsdf</p>\n','adsfadfadsf\nf\nasd\nfas\ndf\nads\nfa\nsdf','<p>adsfadfadsf\nf\nasd\nfas\ndf\nads\nfa\nsdf</p>\n',1,'2016-03-03 16:21:28','2016-03-03 16:21:28',1,0),
	(27,16,0,3,'wewrwer','fasd','<p>fasdfasdf</p>\n','fasdfasdf','<p>fasdfasdf</p>\n',1,'2016-03-03 16:21:33','2016-03-03 16:21:33',1,0),
	(28,16,0,3,'werwer','ewr','<p>fasdfasdf</p>\n','fasdfasdf','<p>fasdfasdf</p>\n',1,'2016-03-03 16:21:39','2016-03-03 16:21:39',1,0),
	(29,16,0,3,'fasdfad','fasf','<p>adfadfadfaf</p>\n','adfadfadfaf','<p>adfadfadfaf</p>\n',1,'2016-03-03 16:21:45','2016-03-03 16:21:45',1,5),
	(30,16,0,3,'fasd','welefen','<p>fadfasdf</p>\n','fadfasdf','<p>fadfasdf</p>\n',1,'2016-03-08 10:17:14','2016-03-08 10:17:14',1,0),
	(31,16,0,0,'fsadf','adf','<p><a href=\"/static/upload/201603/wCNoPNk7B0CGUQf7oTwnLsCn.psd\">链接文本</a></p>\n','[链接文本](/static/upload/201603/wCNoPNk7B0CGUQf7oTwnLsCn.psd)','<p><a href=\"/static/upload/201603/wCNoPNk7B0CGUQf7oTwnLsCn.psd\">链接文本</a></p>\n',1,'2016-03-10 14:00:47','2016-03-10 14:00:47',1,0);

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
	(1,7,1),
	(2,7,2),
	(3,8,1),
	(4,8,2),
	(5,9,1),
	(6,9,4),
	(7,10,1),
	(8,11,1),
	(9,11,2),
	(10,11,4),
	(11,12,1),
	(12,12,2),
	(18,13,6),
	(19,13,7),
	(13,14,1),
	(14,14,2),
	(15,15,1),
	(16,22,6),
	(17,22,7),
	(20,36,1),
	(21,36,7);

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

LOCK TABLES `fk_post_tag` WRITE;
/*!40000 ALTER TABLE `fk_post_tag` DISABLE KEYS */;

INSERT INTO `fk_post_tag` (`id`, `post_id`, `tag_id`)
VALUES
	(20,13,1),
	(21,13,2),
	(3,16,4),
	(4,16,5),
	(5,16,6),
	(6,16,7),
	(7,16,8),
	(8,16,9),
	(9,16,10),
	(10,16,11),
	(16,22,1),
	(17,22,2),
	(18,22,4),
	(19,22,6),
	(22,36,1),
	(23,36,2),
	(29,37,4),
	(28,37,7),
	(27,37,8),
	(24,37,9),
	(25,37,10),
	(26,37,11),
	(30,37,12),
	(31,37,13);

/*!40000 ALTER TABLE `fk_post_tag` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table fk_tag
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_tag`;

CREATE TABLE `fk_tag` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `pathname` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `fk_tag` WRITE;
/*!40000 ALTER TABLE `fk_tag` DISABLE KEYS */;

INSERT INTO `fk_tag` (`id`, `name`, `pathname`)
VALUES
	(1,'Node.js',NULL),
	(2,'JS',NULL),
	(4,'fasd','fasd'),
	(6,'asdf','asdf'),
	(7,'asd','asd'),
	(8,'www','www'),
	(9,'wwww','wwww'),
	(10,'ww','ww'),
	(11,'dd','dd'),
	(12,'we','we'),
	(13,'wefasdfads','wefasdfads');

/*!40000 ALTER TABLE `fk_tag` ENABLE KEYS */;
UNLOCK TABLES;


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
	(16,'admin','','$2a$08$EOZdSw6mI3yp2Ptg2fk8xOz29ER9.MbcvxwF6wiuwfTR7k2QD1GrW',1,'admin@firekylin.com',1,'2016-02-26 09:28:11','127.0.0.1','2016-02-26 09:28:11','127.0.0.1');

/*!40000 ALTER TABLE `fk_user` ENABLE KEYS */;
UNLOCK TABLES;



/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
