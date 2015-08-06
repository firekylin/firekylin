
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `fk_config`
-- ----------------------------
DROP TABLE IF EXISTS `fk_config`;
CREATE TABLE `fk_config` (
  `key` char(20) NOT NULL,
  `value` text,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

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
) ENGINE=InnoDB AUTO_INCREMENT=165 DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `fk_user`
-- ----------------------------
DROP TABLE IF EXISTS `fk_user`;
CREATE TABLE `fk_user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `add_time` datetime DEFAULT NULL,
  `add_ip` bigint(20) unsigned DEFAULT NULL,
  `last_login_time` datetime DEFAULT NULL,
  `last_login_ip` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

SET FOREIGN_KEY_CHECKS = 1;
