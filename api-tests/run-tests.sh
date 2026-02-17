#!/bin/bash

BASE_URL="http://localhost:5000"
TOKEN="YOUR_TOKEN_HERE"

echo "Running Space Portal API Health Check..."
newman run SpacePortalAPI.postman_collection.json \
  --env-var "baseUrl=http://localhost:5000" \
  --env-var "authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OThiMDhmY2IzNTlhYWFkMjU5MThhOGQiLCJlbWFpbCI6InNwYWNlcG9ydGFsLmFkbWluQGZsYXNoc3BhY2UuYWkiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzA3ODUxOTAsImV4cCI6MTc3MDc4NjA5MH0.Z_yF4K_63wgY4RFam22FpW23pFBSu9FV2UfGlvzNmXE" \
  --reporters cli,json \
  --reporter-json-export report.json

if [ $? -eq 0 ]; then
  echo "✅ All APIs working fine!"
else
  echo "❌ Some APIs failed. Check report.json"
fi
