#!/bin/sh

trap "exit 0" TERM INT

while true; do
    certbot renew \
        --webroot \
        -w /var/www/certbot \
        --quiet \
        --deploy-hook "touch /var/www/certbot/.reload-nginx"
    sleep 12h &
    wait $!
done
