#!/bin/sh

trap "exit 0" TERM INT

while true; do
    certbot renew --webroot -w /var/www/certbot --quiet
    sleep 86400 &
    wait $!
done
