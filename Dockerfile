FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ \
    && npm i -g pnpm@9.15.9

COPY package.json /app
COPY packages/firekylin/package.json /app/packages/firekylin/package.json
COPY packages/admin/package.json /app/packages/admin/package.json
COPY pnpm-lock.yaml /app
COPY pnpm-workspace.yaml /app

RUN pnpm i -P --force \
    && mkdir output \
    && cp -r node_modules/ output/node_modules/ \
    && pnpm i --force

COPY . /app

RUN pnpm run build:package \
    && rm -f packages/firekylin/src/config/db.js \
    && rm -rf packages/firekylin/www/static/dist/*.map \
    && rm -rf packages/admin/src

RUN cp -r packages/firekylin/www output/ \
    && cp -r packages/firekylin/src output/ \
    && cp -r packages/firekylin/view output/ \
    && cp packages/firekylin/production.js output/ \
    && cp packages/firekylin/firekylin.sql output/ \
    && cp packages/firekylin/firekylin.pgsql output/ \
    && cp packages/firekylin/firekylin.sqlite.sql output/ \
    && cp packages/firekylin/docker-entrypoint.sh output/

### 准备工作结束

FROM node:24-alpine

ENV APP_PATH=/opt/firekylin
ENV VOLUME_PATH=/var/lib/firekylin

COPY --from=builder /app/output $APP_PATH

WORKDIR $APP_PATH
VOLUME $VOLUME_PATH

EXPOSE 8360

ENTRYPOINT ["/opt/firekylin/docker-entrypoint.sh"]
CMD ["node", "/opt/firekylin/production.js"]
