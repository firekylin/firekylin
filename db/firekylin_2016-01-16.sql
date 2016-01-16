# ************************************************************
# Sequel Pro SQL dump
# Version 4499
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 5.6.19-debug)
# Database: firekylin
# Generation Time: 2016-01-16 07:19:52 +0000
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
  `name` varchar(255) NOT NULL,
  `pid` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table fk_options
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_options`;

CREATE TABLE `fk_options` (
  `key` varchar(255) NOT NULL DEFAULT '',
  `value` text,
  `desc` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `fk_options` WRITE;
/*!40000 ALTER TABLE `fk_options` DISABLE KEYS */;

INSERT INTO `fk_options` (`key`, `value`, `desc`)
VALUES
	('analyze_code',NULL,'统计代码，可以添加百度统计、Google 统计等'),
	('description','A Simple & Fast Node Bloging Platform Base On ThinkJS 2.0 & ReactJS & ES6/7','网站描述'),
	('github_blog',NULL,'GitHub blog 地址，如果填了则同步到 GitHub 上'),
	('github_url',NULL,'GitHub 地址'),
	('image_upload',NULL,'图片存放的位置，默认存在放网站上。也可以选择放在七牛或者又拍云等地方'),
	('keywords',NULL,'网站关键字'),
	('logo_url',NULL,'logo 地址'),
	('miitbeian',NULL,'网站备案号'),
	('num_per_page','10','文章一页显示的条数'),
	('password_salt',NULL,'密码 salt，网站安装的时候随机生成一个'),
	('title','Firekylin\n','网站标题'),
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
  `type` varchar(11) NOT NULL DEFAULT '1' COMMENT '类型，1 为文章， 2 为页面',
  `status` tinyint(11) NOT NULL DEFAULT '0' COMMENT '0 为草稿， 1 为已经发布',
  `title` varchar(255) NOT NULL,
  `pathname` varchar(255) NOT NULL DEFAULT '' COMMENT 'URL 的 pathname',
  `summary` tinytext NOT NULL COMMENT '摘要',
  `markdown_content` text NOT NULL,
  `content` text NOT NULL,
  `create_time` datetime NOT NULL,
  `update_time` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table fk_post_cate
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_post_cate`;

CREATE TABLE `fk_post_cate` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int(11) NOT NULL,
  `cate_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_cate` (`post_id`,`cate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table fk_post_history
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_post_history`;

CREATE TABLE `fk_post_history` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int(11) DEFAULT NULL,
  `markdown_content` text,
  `update_user_id` int(11) DEFAULT NULL COMMENT '更新用户的 ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table fk_post_tag
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_post_tag`;

CREATE TABLE `fk_post_tag` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_tag` (`post_id`,`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table fk_tag
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_tag`;

CREATE TABLE `fk_tag` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table fk_user
# ------------------------------------------------------------

DROP TABLE IF EXISTS `fk_user`;

CREATE TABLE `fk_user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `create_time` datetime NOT NULL,
  `create_ip` varchar(20) NOT NULL DEFAULT '',
  `last_login_time` datetime DEFAULT NULL,
  `last_login_ip` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
