0. 首先需要保证需要 MySQL 的版本大于等于 5.5.3。
1. 数据库 `fk_post` 中的 `title`, `summary`, `markdown_content`, `content` 字段的数据类型需要修改为 `utf8mb4` 。
2. 同时修改 `app/common/config/db.js` 文件，增加一个 `encoding: 'utf8mb4'` 的键值对。