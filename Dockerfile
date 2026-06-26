FROM busybox:1.36.1

WORKDIR /www
COPY index.html styles.css script.js ./

EXPOSE 8080
CMD ["httpd", "-f", "-v", "-p", "8080", "-h", "/www"]
