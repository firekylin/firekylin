#!/bin/sh

set -e

checkVolume(){
    uploadDir="$VOLUME_PATH/upload"

    if [ ! -d $uploadDir ]; then
        echo 'upload dir not found in docker volume /var/lib/firekylin, creating...'
        mkdir -p $VOLUME_PATH/upload
    fi

    echo 'firekylin' > $APP_PATH/.installed
}

if [[ -z $INSTALLED ]] || [[ $(echo $INSTALLED | tr [A-Z] [a-z]) != true ]]; then
    mkdir -p $VOLUME_PATH/upload
else
    checkVolume
fi

touch $VOLUME_PATH/db.js

ln -s $VOLUME_PATH/db.js $APP_PATH/src/common/config/db.js
ln -s $VOLUME_PATH/upload $APP_PATH/www/static/upload
ln -s $APP_PATH/logs /var/log/firekylin

exec "$@"
