#!/bin/sh
# this is for developers to start code instantly
# please run it in the root directory

cp -r db/firekylin.sql firekylin.sql
cp -r bin/db.js src/common/config/db.js

echo "please update 'src/common/config/db.js' with your db config\n"
