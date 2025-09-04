#!/bin/bash

API_KEY="frag_eRDAs3m_kt7hj-9t7M5ubYjQ2apg1oCZP-x-ZdUb7as"
TOKEN_NAME="test-$(date +%s)"

curl -v -X POST \
  https://design-token-management-app.vercel.app/api/tokens \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"tokens": [{"name": "'$TOKEN_NAME'", "value": "#ff0000", "type": "color", "description": "Test token"}], "_debug": true}'
