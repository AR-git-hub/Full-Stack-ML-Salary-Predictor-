#!/bin/sh
set -e

sleep 15

certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$CERTBOT_EMAIL" \
    --agree-tos \
    --non-interactive \
    --no-eff-email \
    --keep-until-expiring
