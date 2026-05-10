FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json /app
COPY pnpm-lock.yaml /app

RUN npm i -g pnpm@9.15.9

RUN pnpm i -P --force \
    && mkdir output \
    && cp -r node_modules/ output/node_modules/ \
    && pnpm i --force

COPY . /app

RUN pnpm run build \
    && pnpm run copy-package \
    && rm -rf src/common/runtime \
    && rm -f src/common/config/db.js \
    && rm -rf output/www/static/js/*.map \
    && rm -rf output/www/static/src

RUN cp -r www output/ \
    && cp -r src output/ \
    && cp production.js output/ \
    && cp firekylin.sql output/ \
    && cp docker-entrypoint.sh output/

### 准备工作结束

FROM keymetrics/pm2:20-alpine

ENV APP_PATH=/opt/firekylin
ENV VOLUME_PATH=/var/lib/firekylin

COPY --from=builder /app/output $APP_PATH

WORKDIR $APP_PATH
VOLUME $VOLUME_PATH

EXPOSE 8360

ENTRYPOINT ["/opt/firekylin/docker-entrypoint.sh"]
CMD ["pm2-runtime", "start", "/opt/firekylin/production.js"]
