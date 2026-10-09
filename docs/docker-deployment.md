# Firekylin Docker 部署教程

本文介绍如何用官方 Docker 镜像部署 Firekylin，并持久化数据库配置和上传文件。推荐使用 Docker Compose；示例默认使用 Firekylin 内置的 SQLite，适合个人博客和中小型站点。

## 准备环境

部署前请确认服务器已安装 Docker Engine 20.10 或更新版本，以及 Docker Compose v2：

```sh
docker version
docker compose version
```

Firekylin 容器监听 `8360` 端口。请确保该端口未被其他程序占用，或在 Compose 文件中改用其他宿主机端口。

## 使用 Docker Compose 部署

创建一个部署目录：

```sh
mkdir firekylin && cd firekylin
```

在该目录中新建 `compose.yaml`：

```yaml
services:
  firekylin:
    image: firekylin/firekylin:2.5.4
    container_name: firekylin
    restart: unless-stopped
    ports:
      - "8360:8360"
    volumes:
      - firekylin-data:/var/lib/firekylin

volumes:
  firekylin-data:
```

启动服务：

```sh
docker compose pull
docker compose up -d
docker compose logs -f firekylin
```

日志出现服务启动信息后，在浏览器打开 `http://服务器地址:8360`，按页面提示完成初始化。选择 SQLite 时，数据库文件和上传内容都会保存在 `firekylin-data` 数据卷中。

生产环境建议固定具体版本标签，例如 `2.5.4`，不要直接使用 `latest`，以免重新部署时意外跨版本升级。

## 使用 Docker 命令部署

不使用 Compose 时，可以运行：

```sh
docker volume create firekylin-data

docker run -d \
  --name firekylin \
  --restart unless-stopped \
  -p 8360:8360 \
  -v firekylin-data:/var/lib/firekylin \
  firekylin/firekylin:2.5.4
```

查看启动日志：

```sh
docker logs -f firekylin
```

## 配置反向代理和 HTTPS

生产环境建议只让反向代理访问 Firekylin，并由 Nginx 或其他网关提供 HTTPS。下面是一个 Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name blog.example.com;

    location / {
        proxy_pass http://127.0.0.1:8360;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

确认 HTTP 访问正常后，再通过 Certbot、Caddy 或云厂商证书服务启用 HTTPS。初始化页面中的站点地址应填写最终的 HTTPS 地址。

## 升级

升级前先备份数据卷，再修改 `compose.yaml` 中的镜像版本：

```sh
docker run --rm \
  -v firekylin-data:/data:ro \
  -v "$PWD":/backup \
  alpine tar czf /backup/firekylin-backup.tgz -C /data .

docker compose pull
docker compose up -d
docker compose logs -f firekylin
```

确认站点正常后保留备份一段时间。不要删除数据卷；`docker compose down` 默认保留数据卷，而 `docker compose down -v` 会删除它。

## 恢复备份

先停止服务，再把备份恢复到数据卷：

```sh
docker compose down

docker run --rm \
  -v firekylin-data:/data \
  -v "$PWD":/backup:ro \
  alpine sh -c 'rm -rf /data/* && tar xzf /backup/firekylin-backup.tgz -C /data'

docker compose up -d
```

恢复命令会覆盖数据卷中的现有内容，请先确认备份文件和数据卷名称正确。

## 常见问题

### 容器启动后立即退出

先查看日志和容器状态：

```sh
docker compose ps
docker compose logs --tail=200 firekylin
```

如果日志中出现 `already exists`、`Permission denied` 或数据库连接错误，请保留完整日志再排查，不要直接删除数据卷。

### ARM 服务器或 Apple Silicon 无法拉取镜像

从 `2.5.4` 之后重新发布的镜像同时提供 `linux/amd64` 和 `linux/arm64`。可用下面的命令确认本机架构和镜像清单：

```sh
docker info --format '{{.Architecture}}'
docker buildx imagetools inspect firekylin/firekylin:2.5.4
```

如果旧版本没有对应架构，请升级到包含该架构的镜像，不建议长期通过模拟方式运行生产服务。

### 端口 8360 已被占用

把 Compose 文件中的端口映射改为其他端口，例如 `8080:8360`，然后访问 `http://服务器地址:8080`。

### 查看数据卷位置

```sh
docker volume inspect firekylin-data
```

日常备份应通过临时容器读取数据卷，不要依赖 Docker 内部存储路径。
