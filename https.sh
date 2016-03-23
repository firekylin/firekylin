#!/bin/bash


USER=$(whoami);
if [ $USER != "root" ];then
	echo "please use sudo to excute";
	exit;
fi

if [[ -z "$1" && -z "$2" ]];then
	echo "请输入域名参数如: sh https.sh gyblog.cn www.gyblog.cn";
	exit 1;
fi

currentpath=$(pwd);

opensslpath=`which openssl`;
if [ -n $opensslpath ];then
	echo "检测openssl成功";	
else
	echo "请确保安装了openssl,并且配置到全局的环境变量";
	exit 1;
fi	

pythonpath=`which python`;
if [ -n $pythonpath ];then
	echo "检测python成功";	
else
	echo "请确保安装了python,并且配置到全局的环境变量";
	exit 1;
fi	

if [ ! -f ${currentpath}"/nginx.conf" ];then
	echo "请把nginx_defult.conf文件更名成 nginx.conf 并且重启nginx";
	exit 1;
fi

rm -rf ssl;

mkdir "ssl";

cd "ssl";

openssl genrsa 4096 > account.key;

openssl genrsa 4096 > domain.key;

if [ -f /etc/ssl/openssl.cnf ];then
	cat /etc/ssl/openssl.cnf > allConfig.conf;
else
	echo "没有检测到openssl.cnf路径，请输入openssl.cnf路径如（/etc/ssl）：";
	read path;
	cat $path/openssl.cnf > allConfig.conf;
fi

echo "[SAN]\nsubjectAltName=DNS:$1,DNS:$2" >> allConfig.conf;

openssl req -new -sha256 -key domain.key -subj "/" -reqexts SAN -config allConfig.conf  > domain.csr;


mkdir ./challenges/;

openssl dhparam -out dhparams.pem 2048;

wget https://raw.githubusercontent.com/diafygi/acme-tiny/master/acme_tiny.py;

python acme_tiny.py --account-key ./account.key --csr ./domain.csr --acme-dir ./challenges/ > ./signed.crt;

wget -O - https://letsencrypt.org/certs/lets-encrypt-x1-cross-signed.pem > intermediate.pem;

cat signed.crt intermediate.pem > chained.pem;

cd ..;

node https.js;

touch /etc/crontab;

echo "0 0 2 * * $currentpath/auto_build.sh >/dev/null 2>&1" >> /etc/crontab;