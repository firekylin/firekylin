#!/bin/sh

set -e

ensure_link() {
    source_path="$1"
    link_path="$2"

    if [ -e "$link_path" ] && [ ! -L "$link_path" ]; then
        echo "Cannot create link: $link_path already exists and is not a symbolic link" >&2
        exit 1
    fi

    rm -f "$link_path"
    ln -s "$source_path" "$link_path"
}

LOG_LINK_PATH="${LOG_LINK_PATH:-/var/log/firekylin}"

mkdir -p "$VOLUME_PATH/upload" "$APP_PATH/logs"
touch "$VOLUME_PATH/db.js"

ensure_link "$VOLUME_PATH/db.js" "$APP_PATH/src/config/db.js"
ensure_link "$VOLUME_PATH/upload" "$APP_PATH/www/static/upload"
ensure_link "$APP_PATH/logs" "$LOG_LINK_PATH"

exec "$@"
