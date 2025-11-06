#!/bin/bash
# Test simulator against running API server
# Usage: ./examples/test-against-api.sh [API_BASE_URL]

set -e  # Exit on error

API_BASE_URL="${1:-http://localhost:3000}"
SIMULATOR_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🧪 Gamma Extension Simulator - API Integration Test"
echo "=================================================="
echo "API Base URL: $API_BASE_URL"
echo "Simulator Dir: $SIMULATOR_DIR"
echo ""

cd "$SIMULATOR_DIR"

# Clean slate
echo "🗑️  Clearing previous data..."
npm run clear > /dev/null 2>&1 || true
echo "✅ Data cleared"
echo ""

# Step 1: Register device
echo "📝 Step 1: Register Device"
echo "----------------------------"
export API_BASE_URL="$API_BASE_URL"
npm run register

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Device registration failed!"
  echo "Make sure API server is running at $API_BASE_URL"
  exit 1
fi

# Extract pairing URL from output
PAIRING_URL=$(npm run register 2>&1 | grep -o 'http[s]*://[^[:space:]]*source=extension[^[:space:]]*' | head -1)
DEVICE_CODE=$(npm run status 2>&1 | grep "Device Code:" | awk '{print $3}')

echo ""
echo "📋 Pairing Information:"
echo "  URL: $PAIRING_URL"
echo "  Code: $DEVICE_CODE"
echo ""

# Step 2: Wait for user to pair
echo "⏸️  Step 2: Pair Device in Browser"
echo "-----------------------------------"
echo "1. Open this URL in your browser:"
echo "   $PAIRING_URL"
echo ""
echo "2. Sign in with your Gamma account"
echo ""
echo "3. Approve the device pairing"
echo ""
echo "Press Enter when you have completed pairing..."
read

# Step 3: Exchange code for token
echo ""
echo "🔄 Step 3: Exchange Code for Token"
echo "------------------------------------"
npm run pair

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Token exchange failed!"
  echo "Possible issues:"
  echo "  - Device not paired in browser"
  echo "  - Pairing code expired"
  echo "  - API server error"
  exit 1
fi

echo ""
echo "✅ Token exchange successful!"

# Step 4: Check status
echo ""
echo "📊 Step 4: Check Authentication Status"
echo "----------------------------------------"
npm run status

# Step 5: Save a presentation
echo ""
echo "💾 Step 5: Save Mock Presentation"
echo "----------------------------------"
PRESENTATION_URL="https://gamma.app/docs/simulator-test-$(date +%s)"
npm run save -- --url "$PRESENTATION_URL"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Presentation save failed!"
  echo "Check API server logs for details"
  exit 1
fi

echo ""
echo "✅ Presentation saved successfully!"

# Step 6: Save another presentation (test token reuse)
echo ""
echo "💾 Step 6: Save Another Presentation (Token Reuse)"
echo "---------------------------------------------------"
PRESENTATION_URL_2="https://gamma.app/docs/simulator-test-2-$(date +%s)"
npm run save -- --url "$PRESENTATION_URL_2"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Second save failed!"
  exit 1
fi

echo ""
echo "✅ Second save successful!"

# Final status
echo ""
echo "📊 Final Status"
echo "----------------"
npm run status

# Summary
echo ""
echo "🎉 Integration Test Complete!"
echo "=============================="
echo "✅ Device registration: Success"
echo "✅ Token exchange: Success"
echo "✅ First save: Success"
echo "✅ Second save: Success"
echo ""
echo "📁 Saved presentations:"
echo "  1. $PRESENTATION_URL"
echo "  2. $PRESENTATION_URL_2"
echo ""
echo "💡 Next steps:"
echo "  - Verify presentations in database"
echo "  - Check API server logs"
echo "  - Test token refresh (wait for expiry)"
echo "  - Test error scenarios"
