FROM node:8.12-alpine as builder

# dtrace-provider@0.8.7 编译安装依赖 python make
RUN echo "https://mirrors.aliyun.com/alpine/v3.8/main/" > /etc/apk/repositories \
    && apk update \
    && apk add python \
    && apk add make

WORKDIR /opt/firekylin

COPY . /opt/firekylin

RUN mkdir output

RUN npm install --only=prod \
    && cp -r node_modules/ output/node_modules/

RUN npm install --only=dev

RUN npm run webpack.build.production \
    && node stc.config.js \
    && npm run copy-package \
    && rm -rf src/common/runtime \
    && rm -f src/common/config/db.js \
    && rm -rf output/www/static/js/*.map

RUN cp -r www/theme/ output/www/theme/ \
    && cp -r src/ output/src/ \
    && cp production.js output/ \
    && cp firekylin.sql output/ \
    && cp docker-entrypoint.sh output/

### 准备工作结束

FROM node:8.12-alpine

WORKDIR /opt/firekylin

COPY --from=builder /opt/firekylin/output /opt/firekylin

VOLUME /var/lib/firekylin

EXPOSE 8360

ENTRYPOINT ["sh", "/opt/firekylin/docker-entrypoint.sh"]
CMD ["node", "/opt/firekylin/production.js"]
