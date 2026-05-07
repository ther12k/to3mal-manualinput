#!/usr/bin/env python3
"""
Simple HTTP log receiver for nginx
Listens for POST requests to /api/log and writes them to app.log in SEQ format
"""

import http.server
import socketserver
import json
import os
import sys
from datetime import datetime

LOG_FILE = "/logs/app.log"
PORT = 8081

class LogHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/log':
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                body = self.rfile.read(content_length)
                try:
                    log_data = json.loads(body.decode('utf-8'))

                    # Create SEQ-formatted log entry
                    timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
                    log_entry = {
                        "time": timestamp,
                        "remote_addr": self.client_address[0],
                        "request": f"POST {self.path} HTTP/1.1",
                        "status": 204,
                        "body_bytes_sent": 0,
                        "request_time": 0,
                        "http_referrer": self.headers.get('Referer', ''),
                        "http_user_agent": self.headers.get('User-Agent', ''),
                        "host": self.headers.get('Host', ''),
                        "request_method": "POST",
                        "request_uri": self.path,
                        "server_protocol": "HTTP/1.1",
                        "log_data": log_data  # The actual log payload
                    }

                    # Write to log file
                    with open(LOG_FILE, 'a') as f:
                        f.write(json.dumps(log_entry) + '\n')

                except json.JSONDecodeError:
                    pass  # Silent fail on invalid JSON

            # Send response
            self.send_response(204)
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Suppress default logging
        pass

def start_server():
    # Ensure log directory exists
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

    print(f"Log receiver listening on port {PORT}")
    print(f"Writing logs to {LOG_FILE}")

    with socketserver.TCPServer(("", PORT), LogHandler) as httpd:
        httpd.serve_forever()

if __name__ == "__main__":
    start_server()
