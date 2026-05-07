FROM alpine:latest

# Install dependencies
RUN apk add --no-cache curl

# Copy log shipper script
COPY log-shipper.sh /usr/local/bin/log-shipper.sh
RUN chmod +x /usr/local/bin/log-shipper.sh

# Create log directory
RUN mkdir -p /logs

# Run log shipper
CMD ["/usr/local/bin/log-shipper.sh"]
