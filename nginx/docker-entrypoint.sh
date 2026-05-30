#!/bin/sh
set -e

envsubst '$DOMAIN' < /etc/nginx/nginx-https.conf.template > /etc/nginx/nginx-https.conf

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    cp /etc/nginx/nginx-https.conf /etc/nginx/nginx.conf
else
    cp /etc/nginx/nginx-http.conf /etc/nginx/nginx.conf
    # Switch to HTTPS once the initial certificate is issued
    (
        while [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; do
            sleep 5
        done
        cp /etc/nginx/nginx-https.conf /etc/nginx/nginx.conf
        nginx -s reload
    ) &
fi

# Reload daily so renewed certificates are always picked up
(while true; do sleep 86400; nginx -s reload; done) &

nginx -g "daemon off;" &
NGINX_PID=$!
wait $NGINX_PID
