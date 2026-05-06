FROM node:20-alpine as builder

WORKDIR /app

COPY package.json /app

RUN npm install --omit=dev --force \
    && mkdir output \
    && mkdir output/www \
    && cp -r node_modules/ output/node_modules/ \
    && npm install --force

COPY . /app

RUN npm run build \
    && mknpm run copy-package \
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

ENV APP_PATH /opt/firekylin
ENV VOLUME_PATH /var/lib/firekylin

COPY --from=builder /app/output $APP_PATH

WORKDIR $APP_PATH
VOLUME $VOLUME_PATH

EXPOSE 8360

ENTRYPOINT ["/opt/firekylin/docker-entrypoint.sh"]
CMD ["pm2-runtime", "start", "/opt/firekylin/production.js"]
