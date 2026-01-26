# Production Stage - nginx only
FROM nginx:alpine

# Create directory for volume
RUN mkdir -p /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Volume for built files
VOLUME ["/usr/share/nginx/html"]

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
