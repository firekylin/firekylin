FROM node:8.12-alpine as builder

# dtrace-provider@0.8.7 编译安装依赖 python make
RUN echo "https://mirrors.aliyun.com/alpine/v3.8/main/" > /etc/apk/repositories \
    && apk update \
    && apk add python \
    && apk add make

WORKDIR /app

COPY package.json /app

RUN npm install --only=prod \
    && mkdir output \
    && cp -r node_modules/ output/node_modules/ \
    && npm install --only=dev

COPY . /app

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

FROM keymetrics/pm2:8-alpine

ENV APP_PATH /opt/firekylin
ENV VOLUME_PATH /var/lib/firekylin

COPY --from=builder /app/output $APP_PATH

WORKDIR $APP_PATH
VOLUME $VOLUME_PATH

EXPOSE 8360

ENTRYPOINT ["/opt/firekylin/docker-entrypoint.sh"]
CMD ["pm2-runtime", "start", "/opt/firekylin/production.js"]
