#!/bin/sh
# Log shipper - tails nginx access logs and sends to SEQ

SEQ_URL="http://172.17.0.1:5341/api/events/raw"
ACCESS_LOG="/nginx-logs/access.log"
APP_LOG="/app-logs/app.log"

echo "Starting log shipper for nginx -> SEQ"
echo "Watching: $ACCESS_LOG and $APP_LOG"

follow_log_file() {
  log_file="$1"
  while [ ! -f "$log_file" ]; do
    echo "Waiting for $log_file..."
    sleep 2
  done

  tail -n 0 -f "$log_file"
}

build_seq_event() {
  line="$1"
  timestamp="$2"

  if echo "$line" | jq -e 'has("log_data")' >/dev/null 2>&1; then
    echo "$line" | jq -c --arg fallback_timestamp "$timestamp" '
      def mask_api_key:
        if type == "string" then
          gsub("ApiKey=[^&]*"; "ApiKey=***")
          | gsub("Apikey=[^&]*"; "Apikey=***")
          | gsub("apikey=[^&]*"; "apikey=***")
        else
          .
        end;

      {
        Timestamp: (.log_data.timestamp // .time // $fallback_timestamp),
        MessageTemplate: (.log_data.message // "Frontend log"),
        Level: (
          if (.log_data.level // "") == "error" then "Error"
          elif (.log_data.level // "") == "warning" or (.log_data.level // "") == "warn" then "Warning"
          else "Information"
          end
        ),
        Properties: (
          (.log_data.properties // {})
          | .endpoint = (.endpoint | mask_api_key)
        ) + {
          source: "frontend",
          log_level: (.log_data.level // null),
          page_referrer: (.http_referrer // ""),
          user_agent: (.http_user_agent // ""),
          remote_addr: (.remote_addr // ""),
          host: (.host // "")
        }
      }
    '
  else
    echo "$line" | jq -c --arg fallback_timestamp "$timestamp" '
      {
        Timestamp: (.time // $fallback_timestamp),
        MessageTemplate: "Nginx HTTP request",
        Level: "Information",
        Properties: . + { source: "nginx" }
      }
    '
  fi
}

# Tail both logs without multi-file headers and send each JSON line to SEQ.
{
  follow_log_file "$ACCESS_LOG" &
  follow_log_file "$APP_LOG" &
  wait
} 2>/dev/null | while read -r line; do
  # Skip empty lines
  [ -z "$line" ] && continue

  # Only ship JSON-formatted log lines. Some nginx deployments still write
  # default access logs, which Seq rejects as raw event properties.
  case "$line" in
    \{*) ;;
    *) continue ;;
  esac

  # Use simple ISO 8601 timestamp without milliseconds (Alpine compatible)
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  EVENT=$(build_seq_event "$line" "$TIMESTAMP")

  if [ -z "$EVENT" ]; then
    continue
  fi

  # Send to SEQ in compact event format
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SEQ_URL" \
    -H "Content-Type: application/json" \
    -H "X-Seq-ApiKey: ${SEQ_API_KEY:-}" \
    -d "{\"events\":[$EVENT]}" 2>&1)

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -1)

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "[$(date +%H:%M:%S)] ✓ Sent to SEQ"
  else
    echo "[$(date +%H:%M:%S)] ✗ Failed: HTTP $HTTP_CODE - $BODY"
  fi
done
