FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json /app
COPY pnpm-lock.yaml /app

npm i -g pnpm

RUN pnpm install --omit=dev --force \
    && mkdir output \
    && mkdir output/www \
    && cp -r node_modules/ output/node_modules/ \
    && pnpm install --force

COPY . /app

RUN pnpm run build \
    && pnpm run copy-package \
    && rm -rf src/common/runtime \
    && rm -f src/common/config/db.js \
    && rm -rf output/www/static/js/*.map

RUN cp -r www/theme/ output/www/theme/ \
    && cp -r src/ output/src/ \
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
