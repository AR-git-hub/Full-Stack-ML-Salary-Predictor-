FROM nginx:1.27-alpine
RUN apk add --no-cache gettext
COPY nginx-http.conf /etc/nginx/nginx-http.conf
COPY nginx-https.conf.template /etc/nginx/nginx-https.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
CMD ["/docker-entrypoint.sh"]
