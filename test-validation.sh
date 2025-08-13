#!/bin/bash

echo "=== Testing Input Validation and Sanitization ==="
echo ""

# Test 1: Invalid BIN (too short)
echo "Test 1: Invalid BIN (too short)"
curl -X POST http://localhost:5000/api/generate-cards \
  -H "Content-Type: application/json" \
  -d '{"bin": "123", "quantity": 1}' 2>/dev/null | jq '.'
echo ""

# Test 2: Invalid BIN (contains letters)
echo "Test 2: Invalid BIN (contains letters)"
curl -X POST http://localhost:5000/api/generate-cards \
  -H "Content-Type: application/json" \
  -d '{"bin": "abc123", "quantity": 1}' 2>/dev/null | jq '.'
echo ""

# Test 3: Invalid quantity (too high)
echo "Test 3: Invalid quantity (too high)"
curl -X POST http://localhost:5000/api/generate-cards \
  -H "Content-Type: application/json" \
  -d '{"bin": "453267", "quantity": 2000}' 2>/dev/null | jq '.'
echo ""

# Test 4: Invalid month
echo "Test 4: Invalid month"
curl -X POST http://localhost:5000/api/generate-cards \
  -H "Content-Type: application/json" \
  -d '{"bin": "453267", "quantity": 1, "month": "13"}' 2>/dev/null | jq '.'
echo ""

# Test 5: XSS attempt in BIN
echo "Test 5: XSS attempt in BIN"
curl -X POST http://localhost:5000/api/generate-cards \
  -H "Content-Type: application/json" \
  -d '{"bin": "<script>alert(1)</script>453267", "quantity": 1}' 2>/dev/null | jq '.'
echo ""

# Test 6: Valid request
echo "Test 6: Valid request"
curl -X POST http://localhost:5000/api/generate-cards \
  -H "Content-Type: application/json" \
  -d '{"bin": "453267", "quantity": 1}' 2>/dev/null | jq '.'
echo ""

# Test 7: BIN lookup with invalid BIN
echo "Test 7: BIN lookup with invalid BIN"
curl http://localhost:5000/api/bin-lookup/abc123 2>/dev/null | jq '.'
echo ""

# Test 8: BIN lookup with valid BIN
echo "Test 8: BIN lookup with valid BIN"
curl http://localhost:5000/api/bin-lookup/453267 2>/dev/null | jq '.'

echo ""
echo "=== Validation Tests Complete ==="
