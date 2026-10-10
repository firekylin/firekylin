DROP TABLE IF EXISTS fk_cate;

CREATE TABLE fk_cate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  pid INTEGER NOT NULL DEFAULT 0,
  pathname TEXT
);


DROP TABLE IF EXISTS fk_options;

CREATE TABLE fk_options (
  key TEXT NOT NULL PRIMARY KEY,
  value TEXT,
  desc TEXT
);

INSERT INTO fk_options (key, value, desc)
VALUES
  ('analyze_code','','统计代码，可以添加百度统计、Google 统计等'),
  ('auto_summary', '0', '自动摘要。0 为禁用，具体的数字为摘要截取的字符数'),
  ('comment','{"type":"duoshuo","name":"welefen2013"}','评论类型'),
  ('description','A Simple & Fast Node Bloging Platform Base On ThinkJS 2.0 & ReactJS & ES6/7','网站描述'),
  ('favicon_url','','favicon'),
  ('github_blog','welefen/blog','GitHub blog 地址，如果填了则同步到 GitHub 上'),
  ('github_url','https://github.com/75team/thinkjs','GitHub 地址'),
  ('image_upload',NULL,'图片存放的位置，默认存在放网站上。也可以选择放在七牛或者又拍云等地方'),
  ('keywords','www,fasdf,fasdfa','网站关键字'),
  ('logo_url','/static/img/firekylin.jpg','logo 地址'),
  ('miitbeian','wewww','网站备案号'),
  ('postsListSize','10','文章一页显示的条数'),
  ('password_salt','firekylin','密码 salt，网站安装的时候随机生成一个'),
  ('push','0','是否允许推送'),
  ('push_sites','','推送网站列表'),
  ('site_url','http://127.0.0.1:8360','网站地址'),
  ('theme','firekylin','主题名称'),
  ('title','Firekylin 系统','网站标题'),
  ('twitter_url','','微博地址'),
  ('navigation', '[{"label":"首页","url":"/","option":"home"},{"label":"归档","url":"/archives/","option":"archive"},{"label":"标签","url":"/tags","option":"tags"},{"label":"关于","url":"/about","option":"user"},{"label":"友链","url":"/links","option":"link"}]', '导航菜单'),
  ('two_factor_auth','','是否开启二步验证'),
  ('upload',NULL,'上传配置，默认为本地，也可以选择七牛或者又拍云');


DROP TABLE IF EXISTS fk_post;

CREATE TABLE fk_post (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  pathname TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  content TEXT NOT NULL,
  allow_comment INTEGER NOT NULL DEFAULT 1,
  create_time DATETIME DEFAULT NULL,
  update_time DATETIME NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 1,
  comment_num INTEGER NOT NULL DEFAULT 0,
  options TEXT
);

CREATE INDEX fk_post_create_time ON fk_post (create_time);


DROP TABLE IF EXISTS fk_post_cate;

CREATE TABLE fk_post_cate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  cate_id INTEGER NOT NULL,
  UNIQUE (post_id, cate_id)
);


DROP TABLE IF EXISTS fk_post_history;

CREATE TABLE fk_post_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER DEFAULT NULL,
  markdown_content TEXT,
  update_user_id INTEGER DEFAULT NULL
);


DROP TABLE IF EXISTS fk_post_tag;

CREATE TABLE fk_post_tag (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  UNIQUE (post_id, tag_id)
);


DROP TABLE IF EXISTS fk_tag;

CREATE TABLE fk_tag (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  pathname TEXT
);


DROP TABLE IF EXISTS fk_user;

CREATE TABLE fk_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '' UNIQUE,
  display_name TEXT DEFAULT NULL,
  password TEXT NOT NULL DEFAULT '',
  type INTEGER NOT NULL DEFAULT 1,
  email TEXT NOT NULL DEFAULT '' UNIQUE,
  status INTEGER NOT NULL DEFAULT 1,
  create_time DATETIME NOT NULL,
  create_ip TEXT NOT NULL DEFAULT '',
  last_login_time DATETIME NOT NULL,
  last_login_ip TEXT NOT NULL DEFAULT '',
  app_key TEXT DEFAULT NULL,
  app_secret TEXT DEFAULT NULL
);
