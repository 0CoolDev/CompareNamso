#!/bin/bash

echo "Testing rate limiting (100 requests/hour per IP)..."
echo "Making 5 test requests to the API..."

for i in {1..5}; do
  echo -e "\n--- Request $i ---"
  curl -i -X GET http://localhost:5000/api/health 2>/dev/null | head -15
  echo ""
  sleep 0.5
done

echo -e "\nCheck the X-RateLimit headers in the responses above."
echo "X-RateLimit-Limit: Maximum requests allowed (100)"
echo "X-RateLimit-Remaining: Requests remaining in current window"
echo "X-RateLimit-Reset: When the rate limit window resets"
