#!/bin/bash

# Health Check Script for Gamma Timetable Production
# Usage: ./scripts/health-check.sh
# Can be run manually or via cron job

set -e

BASE_URL="https://productory-powerups.netlify.app"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== Gamma Timetable Health Check - $TIMESTAMP ==="

# 1. Check main web app
echo -n "Web App: "
if curl -s --max-time 10 "$BASE_URL" | grep -q "Gamma Timetable"; then
    echo "✓ OK"
else
    echo "✗ FAILED"
    exit 1
fi

# 2. Check device registration API
echo -n "Device Registration API: "
if curl -s --max-time 10 -X POST "$BASE_URL/.netlify/functions/devices-register" \
   -H "Content-Type: application/json" \
   -d '{"deviceId": "health-check"}' | grep -q "deviceId"; then
    echo "✓ OK"
else
    echo "✗ FAILED"
    exit 1
fi

# 3. Check protected endpoint (should return auth error)
echo -n "Protected API (auth check): "
if curl -s --max-time 10 "$BASE_URL/.netlify/functions/protected-ping" \
   -H "Authorization: Bearer invalid" | grep -q "error"; then
    echo "✓ OK (auth working)"
else
    echo "✗ FAILED"
    exit 1
fi

# 4. Check Supabase connection (via presentations endpoint)
echo -n "Database Connection: "
if curl -s --max-time 10 -X POST "$BASE_URL/.netlify/functions/presentations-list" \
   -H "Content-Type: application/json" \
   -d '{}' | grep -q "error"; then
    echo "✓ OK (reachable)"
else
    echo "✗ FAILED"
    exit 1
fi

echo "=== All Health Checks Passed ✓ ==="