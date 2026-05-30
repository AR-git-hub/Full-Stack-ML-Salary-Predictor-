#!/bin/sh
set -e

envsubst '$DOMAIN' < /etc/nginx/nginx-https.conf.template > /etc/nginx/nginx-https.conf

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
RELOAD_SIGNAL="/var/www/certbot/.reload-nginx"

if [ -f "$CERT_PATH" ]; then
    cp /etc/nginx/nginx-https.conf /etc/nginx/nginx.conf
    NEED_UPGRADE=0
else
    cp /etc/nginx/nginx-http.conf /etc/nginx/nginx.conf
    NEED_UPGRADE=1
fi

nginx -g "daemon off;" &
NGINX_PID=$!

if [ "$NEED_UPGRADE" = "1" ]; then
    (
        echo "Waiting for SSL certificate..."
        while [ ! -f "$CERT_PATH" ]; do sleep 5; done
        echo "Certificate found - switching to HTTPS"
        cp /etc/nginx/nginx-https.conf /etc/nginx/nginx.conf
        nginx -s reload
    ) &
fi

(
    while true; do
        sleep 3600
        if [ -f "$RELOAD_SIGNAL" ]; then
            rm -f "$RELOAD_SIGNAL"
            echo "Reload signal detected - reloading nginx"
            nginx -s reload
        fi
    done
) &

wait $NGINX_PID
