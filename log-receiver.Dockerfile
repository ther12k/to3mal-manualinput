FROM python:3.12-alpine

WORKDIR /app

# Install Python
RUN apk add --no-cache python3 py3-pip

# Copy log receiver script
COPY log-receiver.py .

# Create log directory
RUN mkdir -p /logs

# Expose port
EXPOSE 8081

# Run the log receiver
CMD ["python3", "log-receiver.py"]
