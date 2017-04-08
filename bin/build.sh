#!/bin/sh

rm -rf firekylin;
rm -rf output;
rm -rf output.theme;

mkdir output;

echo 'webpack start ...';
npm run webpack.build.production;
echo 'webpack end';

node stc.config.js;

mkdir -p www/theme/firekylin.build/html;
cp -r www/theme/firekylin/*.html www/theme/firekylin.build/html/
cp -r www/theme/firekylin/inc www/theme/firekylin.build/html/
cp -r www/theme/firekylin/package.json www/theme/firekylin.build/html/

node stc.view.config.js;

cp -r output.theme/www/theme/firekylin.build/html/* output.theme/www/theme/firekylin;
rm -rf output.theme/www/theme/firekylin.build;
cp -r output.theme/www/ output/www/
rm -rf output.theme;
rm -rf www/theme/firekylin.build/;


npm run compile;
npm run copy-package;

cp -r app output;
rm -rf output/app/common/runtime;

cp -r nginx.conf output/nginx_default.conf;
cp -r pm2.json output/pm2_default.json;
cp -r www/*.js output/www;


cp -r firekylin.sql output/;
if [ 0 -eq `grep -c analyze_code  output/firekylin.sql` ];then
  echo 'missing analyze_code in firekylin.sql';
  exit;
fi


cp -r bin/ssl/auto_build.sh output/;
cp -r bin/ssl/https.js output/;
cp -r bin/ssl/https.sh output/;

rm -r output/app/common/config/db.js;
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
REMOTE_TAR="/var/www/firekylin.org/www/release";
scp $TARNAME $HOST:$REMOTE_TAR;
ssh $HOST cp $REMOTE_TAR/$TARNAME $REMOTE_TAR/latest.tar.gz;
ssh $HOST "echo $VERSION > $REMOTE_TAR/.latest";
