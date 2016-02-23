# ************************************************************
# Sequel Pro SQL dump
# Version 4529
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 5.6.19-debug)
# Database: firekylin
# Generation Time: 2016-02-23 08:18:41 +0000
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



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
  `summary` tinytext CHARACTER SET utf8 NOT NULL COMMENT '摘要',
  `markdown_content` text CHARACTER SET utf8 NOT NULL,
  `content` text CHARACTER SET utf8 NOT NULL,
  `allow_comment` tinyint(11) NOT NULL DEFAULT '1' COMMENT '1 为允许， 0 为不允许',
  `create_time` datetime NOT NULL,
  `update_time` datetime NOT NULL,
  `is_pubic` tinyint(11) NOT NULL DEFAULT '1' COMMENT '1 为公开，0 为不公开',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



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
