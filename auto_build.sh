#!/bin/bash

cd /Users/sgy/https/ssl/
python acme_tiny.py --account-key account.key --csr domain.csr --acme-dir /Users/sgy/https/ssl/challenges/ > signed.crt || exit
wget -O - https://letsencrypt.org/certs/lets-encrypt-x1-cross-signed.pem > intermediate.pem
cat signed.crt intermediate.pem > chained.pem
sudo  /usr/local/nginx/sbin/./nginx -s reload