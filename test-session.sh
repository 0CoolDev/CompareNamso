#!/bin/bash

# Test Session Management
echo "=========================================="
echo "Testing Session Management Security"
echo "=========================================="

BASE_URL="http://localhost:5000"
COOKIE_FILE="/tmp/test_cookies.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\n${GREEN}1. Testing Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c ${COOKIE_FILE} \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Login failed (HTTP $HTTP_STATUS)${NC}"
    echo "Response: $BODY"
fi

echo -e "\n${GREEN}2. Checking Session Cookie${NC}"
if grep -q "sessionId" ${COOKIE_FILE}; then
    echo -e "${GREEN}✓ Session cookie created${NC}"
    
    # Check cookie flags
    COOKIE_LINE=$(grep "sessionId" ${COOKIE_FILE})
    echo "Cookie details:"
    
    if echo "$COOKIE_LINE" | grep -q "HttpOnly"; then
        echo -e "  ${GREEN}✓ HttpOnly flag set${NC}"
    else
        echo -e "  ${RED}✗ HttpOnly flag missing${NC}"
    fi
    
    if echo "$COOKIE_LINE" | grep -q "Secure" || [ "$BASE_URL" = "http://localhost:5000" ]; then
        echo -e "  ${GREEN}✓ Secure flag appropriate for environment${NC}"
    else
        echo -e "  ${RED}✗ Secure flag missing${NC}"
    fi
else
    echo -e "${RED}✗ Session cookie not found${NC}"
fi

echo -e "\n${GREEN}3. Testing Session Check${NC}"
SESSION_RESPONSE=$(curl -s ${BASE_URL}/api/auth/session \
  -b ${COOKIE_FILE} \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$SESSION_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$SESSION_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Session check successful${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Session check failed (HTTP $HTTP_STATUS)${NC}"
    echo "Response: $BODY"
fi

echo -e "\n${GREEN}4. Testing Session Activity Refresh${NC}"
echo "Waiting 2 seconds..."
sleep 2

# Make another request to refresh session
curl -s ${BASE_URL}/api/auth/session -b ${COOKIE_FILE} -c ${COOKIE_FILE} > /dev/null

SESSION_RESPONSE=$(curl -s ${BASE_URL}/api/auth/session \
  -b ${COOKIE_FILE} \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$SESSION_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Session still active (rolling sessions working)${NC}"
else
    echo -e "${RED}✗ Session expired unexpectedly${NC}"
fi

echo -e "\n${GREEN}5. Testing Logout${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/logout \
  -b ${COOKIE_FILE} \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$LOGOUT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$LOGOUT_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Logout successful${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Logout failed (HTTP $HTTP_STATUS)${NC}"
    echo "Response: $BODY"
fi

echo -e "\n${GREEN}6. Verifying Session Destroyed${NC}"
SESSION_RESPONSE=$(curl -s ${BASE_URL}/api/auth/session \
  -b ${COOKIE_FILE} \
  -w "\nHTTP_STATUS:%{http_code}")

BODY=$(echo "$SESSION_RESPONSE" | sed '/HTTP_STATUS/d')
if echo "$BODY" | grep -q '"authenticated":false'; then
    echo -e "${GREEN}✓ Session properly destroyed${NC}"
else
    echo -e "${RED}✗ Session still active after logout${NC}"
    echo "Response: $BODY"
fi

# Cleanup
rm -f ${COOKIE_FILE}

echo -e "\n=========================================="
echo -e "${GREEN}Session Security Test Complete${NC}"
echo "=========================================="
