DROP TABLE IF EXISTS fk_cate;

CREATE TABLE fk_cate (
    id SERIAL PRIMARY KEY,
    name character varying(255) UNIQUE,
    pid integer DEFAULT 0,
    pathname character varying(255),
    description text
);

CREATE UNIQUE INDEX IF NOT EXISTS fk_cate_pkey ON fk_cate(id int4_ops);
CREATE UNIQUE INDEX IF NOT EXISTS fk_cate_name_key ON fk_cate(name text_ops);


DROP TABLE IF EXISTS fk_options;
DROP INDEX IF EXISTS public."fk_options_pkey";

CREATE TABLE fk_options (
    key character varying(255) PRIMARY KEY,
    value text,
    "desc" character varying(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS fk_options_pkey ON fk_options(key text_ops);

INSERT INTO fk_options ("key", "value", "desc")
VALUES
  ('analyze_code','','统计代码，可以添加百度统计、Google 统计等'),
  ('auto_summary', '0', '自动摘要。0 为禁用，具体的数字为摘要截取的字符数'),
  ('comment','{"audit":false,"forceLogin":false,"pageSize":10,"locale":"zh-CN","ipQps":60}','评论设置'),
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
  ('site_url','','网站地址'),
  ('theme','firekylin','主题名称'),
  ('title','Firekylin 系统','网站标题'),
  ('twitter_url','','微博地址'),
  ('navigation', '[{"label":"首页","url":"/","option":"home"},{"label":"归档","url":"/archives/","option":"archive"},{"label":"标签","url":"/tags","option":"tags"},{"label":"关于","url":"/about","option":"user"},{"label":"友链","url":"/links","option":"link"}]', '导航菜单'),
  ('two_factor_auth','','是否开启二步验证'),
  ('upload',NULL,'上传配置，默认为本地，也可以选择七牛或者又拍云');


DROP TABLE IF EXISTS fk_post;
DROP INDEX IF EXISTS public."fk_post_pkey";

CREATE TABLE fk_post (
    id SERIAL PRIMARY KEY,
    user_id integer,
    type integer DEFAULT 0,
    status integer DEFAULT 0,
    title character varying(255),
    pathname character varying(255),
    summary text,
    markdown_content text,
    content text,
    allow_comment integer DEFAULT 1,
    create_time timestamp without time zone,
    update_time timestamp without time zone,
    is_public integer DEFAULT 1,
    comment_num integer DEFAULT 0,
    options text
);

CREATE UNIQUE INDEX IF NOT EXISTS fk_post_pkey ON fk_post(id int4_ops);


DROP TABLE IF EXISTS fk_post_cate;
DROP INDEX IF EXISTS public."fk_post_cate_pkey";

CREATE TABLE fk_post_cate (
    id SERIAL PRIMARY KEY,
    post_id integer,
    cate_id integer
);

CREATE UNIQUE INDEX IF NOT EXISTS fk_post_cate_pkey ON fk_post_cate(id int4_ops);


DROP TABLE IF EXISTS fk_post_history;
DROP INDEX IF EXISTS public."fk_post_history_pkey";

CREATE TABLE fk_post_history (
    id SERIAL PRIMARY KEY,
    post_id integer,
    markdown_content text,
    update_user_id integer
);

CREATE UNIQUE INDEX IF NOT EXISTS fk_post_history_pkey ON fk_post_history(id int4_ops);

DROP TABLE IF EXISTS fk_post_tag;
DROP INDEX IF EXISTS public."fk_post_tag_pkey";

CREATE TABLE fk_post_tag (
    id SERIAL PRIMARY KEY,
    post_id integer,
    tag_id integer
);

CREATE UNIQUE INDEX IF NOT EXISTS fk_post_tag_pkey ON fk_post_tag(id int4_ops);


DROP TABLE IF EXISTS fk_tag;
DROP INDEX IF EXISTS public."fk_tag_pkey";

CREATE TABLE fk_tag (
    id SERIAL PRIMARY KEY,
    name character varying(255),
    pathname character varying(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS fk_tag_pkey ON fk_tag(id int4_ops);

DROP TABLE IF EXISTS fk_user;
DROP INDEX IF EXISTS public."fk_user_pkey";
DROP INDEX IF EXISTS public."fk_user_name_key";
DROP INDEX IF EXISTS public."fk_user_email_key";

CREATE TABLE fk_user (
    id SERIAL PRIMARY KEY,
    name character varying(255) UNIQUE,
    display_name character varying(255),
    password character varying(255),
    type integer DEFAULT 1,
    email character varying(255) UNIQUE,
    status integer DEFAULT 1,
    create_time timestamp without time zone,
    create_ip character varying(20),
    last_login_time timestamp without time zone,
    last_login_ip character varying(20),
    app_key character varying(255),
    app_secret character varying(255),
    url character varying(512),
    avatar character varying(512),
    comment_label character varying(255),
    comment_2fa character varying(64)
);

CREATE UNIQUE INDEX IF NOT EXISTS fk_user_pkey ON fk_user(id int4_ops);
CREATE UNIQUE INDEX IF NOT EXISTS fk_user_name_key ON fk_user(name text_ops);
CREATE UNIQUE INDEX IF NOT EXISTS fk_user_email_key ON fk_user(email text_ops);

CREATE TABLE fk_comment (
    id SERIAL PRIMARY KEY, comment text NOT NULL, url character varying(512) NOT NULL,
    mail character varying(255), nick character varying(255), link character varying(512),
    pid character varying(64), rid character varying(64), ua text, ip character varying(64), user_id character varying(64),
    status character varying(32) NOT NULL DEFAULT 'approved', sticky integer NOT NULL DEFAULT 0,
    "like" integer NOT NULL DEFAULT 0, inserted_at timestamp NOT NULL, created_at timestamp NOT NULL, updated_at timestamp NOT NULL
);
CREATE INDEX fk_comment_url_idx ON fk_comment(url);
CREATE INDEX fk_comment_status_idx ON fk_comment(status);

CREATE TABLE fk_counter (
    id SERIAL PRIMARY KEY, url character varying(512) NOT NULL UNIQUE, time integer NOT NULL DEFAULT 0,
    reaction0 integer NOT NULL DEFAULT 0, reaction1 integer NOT NULL DEFAULT 0, reaction2 integer NOT NULL DEFAULT 0,
    reaction3 integer NOT NULL DEFAULT 0, reaction4 integer NOT NULL DEFAULT 0, reaction5 integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL, updated_at timestamp NOT NULL
);
