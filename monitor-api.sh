#!/bin/bash
# Monitor SEQ for Transaction API calls and extract parameters

SEQ_URL="http://localhost:5341"
API_KEY="" # Leave empty for public SEQ

echo "======================================"
echo "Monitoring SEQ for Transaction API calls..."
echo "======================================"
echo ""
echo "Watching for:"
echo "  - GetTransaction (will extract transactionId, laneId)"
echo "  - GetEticketByTransaction (will extract params)"
echo ""
echo "Ready for scan! Perform RFID/QR scan now..."
echo "======================================"
echo ""

LAST_EVENT_ID=""

while true; do
  # Get recent events
  EVENTS=$(curl -s "${SEQ_URL}/api/events?apiKey=${API_KEY}&count=20" 2>/dev/null)

  # Filter for nginx HTTP request events
  echo "$EVENTS" | jq -r '.[] |
    select(.MessageTemplateTokens // [] | any(.Text == "Nginx HTTP request")) |
    select(.Properties // [] | any(.Name == "request_uri"; .Value | test("Transaction"; "i"))) |

    # Extract request details
    .Timestamp + " | " +
    (.Properties // [] | map(select(.Name == "request_uri"))[0].Value) +
    " | status=" +
    ((.Properties // [] | map(select(.Name == "status"))[0].Value) | tostring)
  ' 2>/dev/null | while read -r line; do
    # Skip if we've already seen this event (simple deduplication)
    echo "$line"

    # Extract and decode parameters
    if echo "$line" | grep -q "GetTransaction"; then
      # Extract gatepass parameter
      GATEPASS=$(echo "$line" | grep -oP 'gatepass=\K[^&]+' | sed 's/%7C/|/g')

      if [ -n "$GATEPASS" ]; then
        echo ""
        echo "=========================================="
        echo "📡 GetTransaction DETECTED!"
        echo "=========================================="
        echo "Gatepass: $GATEPASS"
        echo ""
        echo "API Call to replay:"
        echo "curl -s -X POST -H 'Content-Length: 0' \\"
        echo "  'http://183.91.69.74/AGTOSNUS_Prod/api/Transaction/GetTransaction?Apikey=10%2F0bBqE3MhE87XNWfwLXLTtNx3kwbvrGqJw6%2F7Ul5k%3D&gatepass=$(echo "$GATEPASS" | jq -sRr @uri)'"
        echo ""
        echo "=========================================="
      fi
    fi

    if echo "$line" | grep -q "GetEticketByTransaction"; then
      # Extract transactionId and laneId
      TRANS_ID=$(echo "$line" | grep -oP 'transactionId=\K[^&]+')
      LANE_ID=$(echo "$line" | grep -oP 'laneId=\K[^&]+')

      echo ""
      echo "=========================================="
      echo "📡 GetEticketByTransaction DETECTED!"
      echo "=========================================="
      echo "Transaction ID: $TRANS_ID"
      echo "Lane ID: $LANE_ID"
      echo ""
      echo "API Call to replay:"
        echo "curl -s -X POST -H 'Content-Length: 0' \\"
        echo "  'http://183.91.69.74/AGTOSNUS_Prod/api/Transaction/GetEticketByTransaction?Apikey=10%2F0bBqE3MhE87XNWfwLXLTtNx3kwbvrGqJw6%2F7Ul5k%3D&transactionId=${TRANS_ID}&laneId=${LANE_ID}' | jq '.'"
        echo ""
        echo "Then inspect for:"
        echo "  - containerCombo field"
        echo "  - container2, container_combo, combo, pair, etc."
        echo "  - reqno, container, code values"
        echo "=========================================="
      fi
    fi
  done

  sleep 2
done
