#!/bin/bash

# Test script to verify Clerk user data is being fetched correctly

echo "Testing auth-bootstrap endpoint with real Clerk token..."
echo "======================================================="

# You'll need to get a real Clerk session token from the browser console
# After signing in, run: await window.clerk.session.getToken()
CLERK_TOKEN="YOUR_CLERK_SESSION_TOKEN_HERE"

if [ "$CLERK_TOKEN" = "YOUR_CLERK_SESSION_TOKEN_HERE" ]; then
  echo "Please update the CLERK_TOKEN variable with a real token from the browser."
  echo "After signing in, run in browser console: await window.clerk.session.getToken()"
  exit 1
fi

# Test the auth-bootstrap endpoint
echo "Calling /api/auth/bootstrap..."
curl -X POST http://localhost:3000/api/auth/bootstrap \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool

echo ""
echo "Check the response above:"
echo "- user.email should be a REAL email address (not @unknown.clerk)"
echo "- user.name should be the REAL user name (not 'Gamma User')"
echo ""
echo "You can also check the database directly:"
echo "psql $DATABASE_URL -c \"SELECT clerk_id, email, name FROM users ORDER BY created_at DESC LIMIT 5;\""