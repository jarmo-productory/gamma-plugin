#!/bin/bash

# Production Health Check Script for Gamma Timetable Extension
# Tests critical endpoints on production deployment

set -e

SITE_URL="https://productory-powerups.netlify.app"
HEALTH_ENDPOINT="${SITE_URL}/api/health"

echo "🏥 Production Health Check Starting..."
echo "🌐 Testing: ${SITE_URL}"
echo ""

# Test 1: Health endpoint
echo "1️⃣ Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "${HEALTH_ENDPOINT}")
HTTP_STATUS=$(echo $HEALTH_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
BODY=$(echo $HEALTH_RESPONSE | sed -e 's/HTTPSTATUS:.*//g')

if [ $HTTP_STATUS -eq 200 ]; then
    echo "✅ Health endpoint: OK (${HTTP_STATUS})"
    echo "   Response: ${BODY}"
else
    echo "❌ Health endpoint: FAILED (${HTTP_STATUS})"
    echo "   Response: ${BODY}"
    exit 1
fi

# Test 2: Main site accessibility
echo ""
echo "2️⃣ Testing Main Site Accessibility..."
MAIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "${SITE_URL}")
MAIN_STATUS=$(echo $MAIN_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ $MAIN_STATUS -eq 200 ]; then
    echo "✅ Main site: OK (${MAIN_STATUS})"
else
    echo "❌ Main site: FAILED (${MAIN_STATUS})"
    exit 1
fi

# Test 3: Critical API endpoints (should return auth errors, not 404s)
echo ""
echo "3️⃣ Testing Critical API Endpoints..."

ENDPOINTS=(
    "/api/user/profile"
    "/api/presentations/list"
    "/api/devices/register"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo "   Testing: ${endpoint}"
    API_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "${SITE_URL}${endpoint}")
    API_STATUS=$(echo $API_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    # Accept 401 (auth required), 403 (forbidden), 405 (method not allowed), or 200 as success - means endpoint exists
    if [ $API_STATUS -eq 401 ] || [ $API_STATUS -eq 403 ] || [ $API_STATUS -eq 405 ] || [ $API_STATUS -eq 200 ]; then
        echo "   ✅ ${endpoint}: OK (${API_STATUS} - endpoint exists)"
    else
        echo "   ❌ ${endpoint}: FAILED (${API_STATUS} - endpoint may be missing)"
        exit 1
    fi
done

echo ""
echo "🎉 All health checks passed!"
echo "🚀 Production deployment is healthy and ready"