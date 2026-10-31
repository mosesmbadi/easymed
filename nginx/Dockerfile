FROM nginx:1.25

# One image for every deployment: the host name and certificate come from the
# deployment's environment (NGINX_SERVER_NAME, NGINX_CERT_DOMAIN) and are
# rendered from the template when the container starts.
RUN rm /etc/nginx/conf.d/default.conf
COPY templates/ /etc/nginx/templates/

EXPOSE 80 443
