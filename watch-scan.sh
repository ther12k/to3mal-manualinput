#!/bin/bash
# Real-time SEQ monitor for Transaction API calls

echo "======================================"
echo "🔍 Monitoring SEQ for fresh scan..."
echo "======================================"
echo ""
echo "Waiting for:"
echo "  1. GetTransaction with gatepass"
echo "  2. GetEticketByTransaction with transactionId + laneId"
echo ""
echo "Last check: $(date '+%H:%M:%S')"
echo "======================================"
echo ""

LAST_TIMESTAMP=""

while true; do
  # Get recent events from last 5 minutes
  EVENTS=$(curl -s "http://localhost:5341/api/events?apiKey=&count=50" 2>/dev/null)

  # Look for Transaction API calls
  NEW_GETTRANSACTION=$(echo "$EVENTS" | jq -r '.[] |
    select(.MessageTemplateTokens // [] | any(.Text == "Nginx HTTP request")) |
    select(.Properties // [] | any(.Name == "request_uri"; .Value | contains("GetTransaction"))) |
    select(.Properties // [] | any(.Name == "status"; .Value == 200)) |
    "\(.Timestamp) | \(.Properties // [] | map(select(.Name == \"request_uri\"))[0].Value)"
  ' 2>/dev/null | head -1)

  NEW_GETETICKET=$(echo "$EVENTS" | jq -r '.[] |
    select(.MessageTemplateTokens // [] | any(.Text == "Nginx HTTP request")) |
    select(.Properties // [] | any(.Name == "request_uri"; .Value | contains("GetEticketByTransaction"))) |
    "\(.Timestamp) | \(.Properties // [] | map(select(.Name == \"request_uri\"))[0].Value)"
  ' 2>/dev/null | head -1)

  # Check if we have new events
  if [ -n "$NEW_GETTRANSACTION" ] && [ "$NEW_GETTRANSACTION" != "$LAST_TIMESTAMP" ]; then
    echo ""
    echo "=========================================="
    echo "✅ NEW GetTransaction DETECTED!"
    echo "=========================================="
    echo "$NEW_GETTRANSACTION"
    echo ""

    # Extract gatepass
    GATEPASS=$(echo "$NEW_GETTRANSACTION" | grep -oP 'gatepass=\K[^& ]+' | sed 's/%7C/|/g')
    echo "Gatepass: $GATEPASS"
    echo "=========================================="
    echo ""

    LAST_TIMESTAMP="$NEW_GETTRANSACTION"
  fi

  if [ -n "$NEW_GETETICKET" ]; then
    # Check if this is new (not the same as last seen)
    CURRENT_ETICKET_COUNT=$(echo "$EVENTS" | jq -r '[.[] |
      select(.MessageTemplateTokens // [] | any(.Text == "Nginx HTTP request")) |
      select(.Properties // [] | any(.Name == "request_uri"; .Value | contains("GetEticketByTransaction")))] | length' 2>/dev/null)

    if [ "$CURRENT_ETICKET_COUNT" -gt 0 ]; then
      echo ""
      echo "=========================================="
      echo "✅ NEW GetEticketByTransaction DETECTED!"
      echo "=========================================="
      echo "$NEW_GETETICKET"
      echo ""

      # Extract transactionId and laneId
      TRANS_ID=$(echo "$NEW_GETETICKET" | grep -oP 'transactionId=\K[^& ]+')
      LANE_ID=$(echo "$NEW_GETETICKET" | grep -oP 'laneId=\K[^& ]+')

      echo "📋 Transaction ID: $TRANS_ID"
      echo "📋 Lane ID: $LANE_ID"
      echo ""
      echo "=========================================="
      echo "🔄 Ready to replay API call!"
      echo "=========================================="
      echo ""
      echo "Run this to inspect the response:"
      echo ""
      echo "curl -s -X POST -H 'Content-Length: 0' \\"
      echo "  'http://183.91.69.74/AGTOSNUS_Prod/api/Transaction/GetEticketByTransaction?Apikey=10%2F0bBqE3MhE87XNWfwLXLTtNx3kwbvrGqJw6%2F7Ul5k%3D&transactionId=${TRANS_ID}&laneId=${LANE_ID}' | jq '.'"
      echo ""
      echo "=========================================="
      echo ""

      # Save to file for easy access
      echo "TRANSACTION_ID=$TRANS_ID" > /tmp/scan-params.txt
      echo "LANE_ID=$LANE_ID" >> /tmp/scan-params.txt

      break
    fi
  fi

  # Show waiting indicator every 10 seconds
  if [ $(( $(date +%s) % 10 )) -eq 0 ]; then
    echo -ne "\r⏳ Waiting for scan... ($(date '+%H:%M:%S'))  "
  fi

  sleep 2
done

echo ""
echo "======================================"
echo "✅ Scan captured! Check /tmp/scan-params.txt"
echo "======================================"
