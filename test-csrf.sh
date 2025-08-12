#!/bin/bash

echo "Testing CSRF Protection Implementation"
echo "======================================"

# Base URL
BASE_URL="http://localhost:5000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Get CSRF Token
echo -e "\n1. Fetching CSRF token..."
RESPONSE=$(curl -s -c cookies.txt -X GET "$BASE_URL/api/csrf-token")
CSRF_TOKEN=$(echo $RESPONSE | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$CSRF_TOKEN" ]; then
    echo -e "${GREEN}✓ CSRF token obtained: ${CSRF_TOKEN:0:20}...${NC}"
else
    echo -e "${RED}✗ Failed to get CSRF token${NC}"
    exit 1
fi

# Test 2: Make POST request without CSRF token (should fail)
echo -e "\n2. Testing POST without CSRF token (should fail)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/test" \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}' \
    -b cookies.txt)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}✓ Request correctly rejected (403 Forbidden)${NC}"
else
    echo -e "${RED}✗ Request was not rejected (HTTP $HTTP_CODE)${NC}"
fi

# Test 3: Make POST request with CSRF token (should succeed or return 404 if endpoint doesn't exist)
echo -e "\n3. Testing POST with CSRF token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/test" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -d '{"test": "data"}' \
    -b cookies.txt)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" != "403" ]; then
    echo -e "${GREEN}✓ Request passed CSRF check (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Request was rejected despite valid token (HTTP $HTTP_CODE)${NC}"
fi

# Clean up
rm -f cookies.txt

echo -e "\n${GREEN}CSRF Protection Test Complete!${NC}"
