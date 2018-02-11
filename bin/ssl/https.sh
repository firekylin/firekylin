#!/bin/bash


USER=$(whoami);
if [ $USER != "root" ];then
	echo "请使用 sudo 来执行";
	exit;
fi

if [[ -z "$1" && -z "$2" ]];then
	echo "请输入域名参数如: sh https.sh gyblog.cn www.gyblog.cn";
	exit 1;
fi

currentpath=$(pwd);

opensslpath=`which openssl`;
if [ -n $opensslpath ];then
	echo "检测 openssl 成功";	
else
	echo "请确保安装了 openssl，并且配置到全局的环境变量";
	exit 1;
fi	

pythonpath=`which python`;
if [ -n $pythonpath ];then
	echo "检测 python 成功";	
else
	echo "请确保安装了 python，并且配置到全局的环境变量";
	exit 1;
fi	

if [ ! -f ${currentpath}"/nginx.conf" ];then
	echo "请把 nginx_defult.conf 文件更名成 nginx.conf，并且重启 nginx";
	exit 1;
fi

if [ ! -d ssl ]; then
	mkdir ssl;
fi

cd ssl;

if [ ! -f "account.key" ];then
	openssl genrsa 4096 > account.key;
fi

if [ ! -f "domain.key" ];then
	openssl genrsa 4096 > domain.key;
fi

if [ ! -f domain.csr ]; then
	if [ -f /etc/ssl/openssl.cnf ];then
		cat /etc/ssl/openssl.cnf > config.conf;
	elif [ -f /usr/local/openssl/ssl/openssl.cnf ]; then
		cat /usr/local/openssl/ssl/openssl.cnf > config.conf;
	else
		echo "没有检测到 openssl.cnf 路径，请输入 openssl.cnf 路径如（/etc/ssl）：";
		read path;
		if [ ! -f $path/openssl.cnf ]; then
			echo "$path/openssl.cnf 路径不存在";
			exit;
		fi
		cat $path/openssl.cnf > config.conf;
	fi

	echo "[SAN]\nsubjectAltName=DNS:$1,DNS:$2" >> config.conf;
	openssl req -new -sha256 -key domain.key -subj "/" -reqexts SAN -config config.conf  > domain.csr;
	rm -rf config.conf;
fi

if [ ! -d challenges ]; then
	mkdir challenges;
fi


if [ ! -f  dhparams.pem ]; then
	openssl dhparam -out dhparams.pem 2048;
fi

if [ ! -f acme_tiny.py ]; then
	wget https://raw.githubusercontent.com/diafygi/acme-tiny/master/acme_tiny.py;
fi

python acme_tiny.py --account-key ./account.key --csr ./domain.csr --acme-dir ./challenges/ > ./signed.crt;

if [ ! -f  intermediate.pem ]; then
	wget -O - https://letsencrypt.org/certs/lets-encrypt-x3-cross-signed.pem > intermediate.pem;
fi

cat signed.crt intermediate.pem > chained.pem;

cd ..;

node https.js;

touch /etc/crontab;

echo "0 0 2 * * $currentpath/auto_build.sh >/dev/null 2>&1" >> /etc/crontab;
