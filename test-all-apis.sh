#!/bin/bash

# Configuration
BASE_URL="http://localhost:5000/api"
EMAIL="customer@flashspace.ai"
PASSWORD="SpacePortal@2026"

# Green/Red colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "==========================================="
echo "   FlashSpace API Test Suite"
echo "==========================================="
echo "Target: $BASE_URL"
echo "User: $EMAIL"
echo "-------------------------------------------"

# 1. Login
echo -n "Logging in... "
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

# Extract Token (using simple grep/sed for portability, assuming clean JSON)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}FAILED${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo -e "${GREEN}SUCCESS${NC}"
# echo "Token: $TOKEN"

# Function to test GET endpoints
test_get() {
  ENDPOINT=$1
  NAME=$2
  
  echo -n "Testing $NAME ($ENDPOINT)... "
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL$ENDPOINT" \
    -H "Authorization: Bearer $TOKEN")
  
  if [ "$RESPONSE" -eq 200 ] || [ "$RESPONSE" -eq 201 ]; then
    echo -e "${GREEN}PASS ($RESPONSE)${NC}"
  else
    echo -e "${RED}FAIL ($RESPONSE)${NC}"
  fi
}

echo "-------------------------------------------"
echo "   Read Operations (GET)"
echo "-------------------------------------------"

# Auth & User
test_get "/auth/profile" "User Profile"
test_get "/user/dashboard" "User Dashboard"
test_get "/user/bookings" "User Bookings"
test_get "/user/invoices" "User Invoices"
test_get "/user/credits" "User Credits"
test_get "/user/kyc" "KYC Status"

# Spaces (Public)
test_get "/coworkingSpace/getAll" "All Coworking Spaces"
test_get "/virtualOffice/getAll" "All Virtual Offices"
test_get "/meetingRoom/getAll" "All Meeting Rooms"
test_get "/eventSpace/getAll" "All Event Spaces"

# Contact Forms
test_get "/contactForm/getAllContactForm" "Contact Forms (Admin?)" # Might fail if user is not admin

# Feedback
test_get "/feedback" "Feedback List"

echo "-------------------------------------------"
echo "   Write Operations (POST)"
echo "-------------------------------------------"

# Create Contact Form
echo -n "Testing Submit Contact Form... "
CONTACT_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/contactForm/createContactForm" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "phone": "1234567890", "message": "API Test Message"}')

if [ "$CONTACT_RESP" -eq 200 ] || [ "$CONTACT_RESP" -eq 201 ]; then
  echo -e "${GREEN}PASS ($CONTACT_RESP)${NC}"
else
  echo -e "${RED}FAIL ($CONTACT_RESP)${NC}"
fi

echo "==========================================="
echo "   Tests Completed"
echo "==========================================="
