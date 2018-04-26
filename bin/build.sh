#!/bin/sh

rm -rf firekylin;
rm -rf output;
rm -rf output.theme;

mkdir output;
if [ ! -d "./build" ]; then
  mkdir ./build;
fi

echo 'webpack start ...';
npm run webpack.build.production;
echo 'webpack end';

node stc.config.js;

mkdir -p output/www/theme;
cp -Xr www/theme/firekylin output/www/theme;
# rm stc plugin in theme file temporary
# mkdir -p www/theme/firekylin.build/html;
# cp -r www/theme/firekylin/*.html www/theme/firekylin.build/html/
# cp -r www/theme/firekylin/inc www/theme/firekylin.build/html/
# cp -r www/theme/firekylin/package.json www/theme/firekylin.build/html/

# node stc.view.config.js;

# cp -r output.theme/www/theme/firekylin.build/html/* output.theme/www/theme/firekylin;
# rm -rf output.theme/www/theme/firekylin.build;
# cp -r output.theme/www/ output/www/
# rm -rf output.theme;
# rm -rf www/theme/firekylin.build/;


# npm run compile;
npm run copy-package;

cp -Xr src output;
rm -rf output/src/common/runtime;

cp -Xr nginx.conf output/nginx_default.conf;
cp -Xr pm2.json output/pm2_default.json;
cp -Xr production.js output/production.js;


cp -Xr firekylin.sql output/;
if [ 0 -eq `grep -c analyze_code  output/firekylin.sql` ];then
  echo 'missing analyze_code in firekylin.sql';
  exit;
fi


cp -Xr bin/ssl/auto_build.sh output/;
cp -Xr bin/ssl/https.js output/;
cp -Xr bin/ssl/https.sh output/;

if [ -f output/src/common/config/db.js ]; then
  rm -r output/src/common/config/db.js;
fi
rm -rf output/www/static/js/*.map;
mv output firekylin;
VERSION=`cat .version`;
TARNAME=firekylin_${VERSION}.tar.gz;
tar zcf $TARNAME firekylin/;
mv $TARNAME build;
rm -rf firekylin/;

cd build;
tar zxvfm $TARNAME;


HOST="root@firekylin.org";
REMOTE_TAR="/var/www/firekylin.org/www/release/v1";
scp $TARNAME $HOST:$REMOTE_TAR;
ssh $HOST cp $REMOTE_TAR/$TARNAME $REMOTE_TAR/latest.tar.gz;
ssh $HOST "echo $VERSION > $REMOTE_TAR/.latest";
