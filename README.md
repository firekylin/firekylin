## FireKylin

A Simple & Fast Node Bloging Platform Base On ThinkJS 2.0 & ReactJS & ES2015+

## 安装

[下载最新的安装包 - v0.3.0](https://raw.githubusercontent.com/75team/firekylin/master/build/firekylin_0.3.0.tar.gz)

## 安装依赖

解压安装包，执行 `npm install` 安装对应的依赖（执行之前请确认已有 Node.js 环境，Node.js 版本要大于 4.0）。

## 启动服务

执行 `npm start`，然后访问 `http://127.0.0.1:8360`，根据提示填写相关信息进行安装。

## 配置 PM2

在服务器上推荐使用 `pm2` 来管理 Node.js 服务，可以通过 `sudo npm install -g pm2` 来安装 `pm2`。

将项目下的 `pm2_default.json` 文件改为 `pm2.json`，将文件中的 `cwd` 配置值改为项目的当前路径。

然后通过 `pm2 start pm2.json` 来启动项目。

## 配置 nginx

将项目下的 `nginx_default.conf` 改为 `nginx_conf`，修改文件中的 `server_name`、`root` 和 `set $node_port` 等配置值，然后将该文件软链到 nginx 的配置目录下。

假设 nginx 的配置目录为 `/usr/local/nginx/conf/include`，那么可以通过下面的命令设置软链：

```sh
sudo ln -s path/to/nginx.conf /usr/local/nginx/conf/include/www.example.com.conf
```

需要将 `path.to` 改为当前的项目路径， `www.example.com` 改为对应的域名。

## 修改端口

默认 Firekylin 用的端口是 `8360`，如果该端口已经被占用或者不想使用该端口，那么可以在项目目录下新建文件 `port`，文件内容为端口号。如：

设置文件 `port` 的内容为 `9999`，表示设置的端口为 `9999`。

修改端口后需要重启 Node.js 服务，可以通过 `pm2 restart pm2.json` 来重启。

## 升级

下载最新的安装包，解压覆盖原有的目录，然后通过 `pm2 restart pm2.json` 重启服务。

部分版本升级可能需要更新数据表，具体请见[这里](https://github.com/75team/firekylin/wiki/%E7%89%88%E6%9C%AC%E5%8D%87%E7%BA%A7)。

## 贡献代码

安装包里的代码都是编译后的（如：React 代码已经编译，HTML、JS、CSS 都已经压缩，并且使用了 LocalStorage 等优化技术）。如果想贡献代码，可以直接 clone 项目代码。

如何开发请见[这里](https://github.com/75team/firekylin/wiki/%E5%A6%82%E4%BD%95%E8%B4%A1%E7%8C%AE%E4%BB%A3%E7%A0%81%EF%BC%9F)。