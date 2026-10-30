# CLI 安装与升级

## 独立站点

当前源码要求 Node.js `^22.13.0 || >=24`。准备符合要求的 Node.js 和 npm，然后创建站点：

```sh
npx firekylin new my-blog
cd my-blog
npm start
```

初始化会选择 SQLite、MySQL、TiDB 或 PostgreSQL，建立数据表并创建管理员账号。TiDB 使用 MySQL 协议，生成的连接配置启用 TLS 1.2 最低版本与证书校验。服务默认监听 8360 端口，后台入口为 `/admin`。正式部署时配置域名、HTTPS 和进程守护，并将站点 URL 改为实际访问地址。

| 路径 | 内容 |
| --- | --- |
| `firekylin.config.js` | 数据库、服务端及扩展配置 |
| `node_modules/firekylin/` | 核心依赖，不应直接修改 |
| `themes/firekylin/` | 初始化时复制的默认主题 |
| `plugins/` | 项目扩展 |
| `uploads/` | 本地上传文件 |
| `data/` | 默认 SQLite 数据库、日志及运行时文件 |
| `firekylin.d.ts` | 主题与 Widget 的类型入口 |

在站点项目中，`npm run dev` 等价于 `firekylin -D`，启动后端开发模式。它与核心仓库的 `pnpm dev` 不同，后者启动 Vite 后台前端开发服务器。

## 非交互初始化

以下示例只适用于新的站点；先将占位密码和站点地址替换为自己的值：

```sh
npx firekylin new my-blog --non-interactive --skip-install \
  --db-type sqlite --db-path data/firekylin.sqlite --db-prefix fk_ \
  --site-title "My Blog" --site-url "https://example.com" \
  --admin-user admin --admin-password '<replace-with-a-strong-password>' \
  --admin-email admin@example.com --package-manager npm
cd my-blog
npm install
npm start
```

`--skip-install` 只跳过依赖安装，仍会初始化数据库。省略该参数时，CLI 自动执行所选包管理器的安装命令。命令行密码可能进入 shell history 或进程参数；人工部署优先使用交互流程。初始化中断时，`data/.firekylin-initializing.json` 可能包含管理员信息，勿提交或公开。

### 参数参考

| 参数 | 用途 |
| --- | --- |
| `--db-type` | `sqlite`、`mysql`、`tidb` 或 `postgresql` |
| `--db-path` | SQLite 文件路径；交互默认 `data/firekylin.sqlite` |
| `--db-host`、`--db-port` | MySQL/TiDB/PostgreSQL 地址和端口；交互默认端口分别为 3306/3306/5432 |
| `--db-name`、`--db-user`、`--db-password` | 远程数据库名和凭据 |
| `--db-prefix` | 表前缀，CLI 默认 `fk_`，使用字母、数字和下划线 |
| `--site-title`、`--site-url` | 站点名称和公开 URL |
| `--admin-user`、`--admin-password`、`--admin-email` | 初始管理员信息 |
| `--package-manager` | `npm`、`pnpm` 或 `yarn`；默认根据调用环境选择，无法识别时用 npm |
| `--non-interactive` | 不提问；必须显式提供所选数据库和站点所需参数 |
| `--skip-install` | 跳过安装依赖，之后自行安装 |
| `--skip-initialize` | 只创建骨架，跳过数据库和站点初始化 |
| `-h`、`--help` | 查看命令帮助 |
| `-v`、`--version` | 查看 CLI 版本 |
| `-D`、`--development` | 启动站点时使用开发模式 |

非交互模式不会自动套用交互提问中的数据库地址、端口及站点默认值。SQLite 需要 `--db-path`；其他数据库需要连接参数。正常初始化还需要全部站点和管理员参数。

## 复用已初始化的数据库

```sh
npx firekylin new existing-blog --skip-initialize --db-type postgresql
```

此命令不会提问、连接数据库、建库、建表或创建管理员。未指定 `--db-type` 时骨架使用 SQLite。启动前须自行填写 `firekylin.config.js` 的连接配置，并确保数据库、表和管理员已经就绪。即使同时传入数据库地址参数，跳过初始化生成的骨架也不会写入完整连接信息；请检查实际配置。CLI 没有将此骨架自动补做初始化的独立子命令。

## 升级与已有部署

升级前备份数据库、配置、主题、插件和上传文件。在独立项目中更新 `firekylin` 依赖，使用该项目的包管理器安装，然后重启并验证站点和后台。核心依赖升级不会覆盖项目中的默认主题副本；主题更新是单独的操作，先保存自定义修改。不要对已有站点重新运行初始化来代替升级。

旧源码布局仍保留 `production.js`、`development.js` 和网页安装流程。已有部署应先确认目录布局再升级，不能直接套用独立项目的路径。后台多实例认证和旧密钥迁移见 [JWT 认证](admin-jwt.md)。

核心开发请按照仓库 `package.json` 的 `packageManager` 安装工具，使用 `pnpm install --frozen-lockfile`、`pnpm run build`，再运行 `pnpm start`。安装的 npm 版本与仓库源码可能不同，先用 `npx --no-install firekylin --version` 和 `--help` 核对所用 CLI。
