#!/bin/sh

rm -rf firekylin;
rm -rf output;
rm -rf output.theme;

mkdir output;
if [ ! -d "./build" ]; then
  mkdir ./build;
fi

echo 'vite start ...';
npm run build;
echo 'vite end';


mkdir -p output/www/theme;
cp -r www/theme/firekylin output/www/theme;
# rm stc plugin in theme file temporary
# mkdir -p www/theme/firekylin.build/html;
# cp -r www/theme/firekylin/*.html www/theme/firekylin.build/html/
# cp -r www/theme/firekylin/inc www/theme/firekylin.build/html/
# cp -r www/theme/firekylin/package.json www/theme/firekylin.build/html/

cp -r view output/view;
mkdir -p output/www/static;
tar -cf - -C www/static --exclude=src --exclude=upload . | tar -xf - -C output/www/static;
# node stc.view.config.js;

# cp -r output.theme/www/theme/firekylin.build/html/* output.theme/www/theme/firekylin;
# rm -rf output.theme/www/theme/firekylin.build;
# cp -r output.theme/www/ output/www/
# rm -rf output.theme;
# rm -rf www/theme/firekylin.build/;


# npm run compile;
npm run copy-package;

cp -r src output;
rm -rf output/src/common/runtime;

cp -r nginx.conf output/nginx_default.conf;
cp -r pm2.json output/pm2_default.json;
cp -r production.js output/production.js;
# cp -r now.js output/now.js;
# cp -r now.json output/now.json;


cp -r firekylin.sql output/;
cp -r firekylin.pgsql output/;
if [ 0 -eq `grep -c analyze_code  output/firekylin.sql` ];then
  echo 'missing analyze_code in firekylin.sql';
  exit;
fi


cp -r bin/ssl/auto_build.sh output/;
cp -r bin/ssl/https.js output/;
cp -r bin/ssl/https.sh output/;

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
