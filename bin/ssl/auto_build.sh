#!/bin/bash

cd $path/ssl/;
python acme_tiny.py --account-key account.key --csr domain.csr --acme-dir $path/ssl/challenges/ > signed.crt || exit
wget -O - https://letsencrypt.org/certs/lets-encrypt-x1-cross-signed.pem > intermediate.pem
cat signed.crt intermediate.pem > chained.pem
sudo  /usr/local/nginx/sbin/nginx -s reload