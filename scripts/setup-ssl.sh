#!/bin/bash

apt update
apt install -y certbot python3-certbot-nginx

certbot --nginx -d attuned.ru -d www.attuned.ru \
    --non-interactive \
    --agree-tos \
    --email parshin.dd@phystech.edu

echo "0 0,12 * * * root certbot renew --quiet" | sudo tee -a /etc/crontab
