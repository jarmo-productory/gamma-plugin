#!/bin/bash

# Performance Monitoring Script for Netlify Deployment
# DevOps Infrastructure - Production Performance Monitoring

set -euo pipefail

SITE_URL="${SITE_URL:-https://productory-powerups.netlify.app}"
WEBHOOK_URL="${PERFORMANCE_WEBHOOK_URL:-}"
LOG_FILE="/tmp/performance-monitor.log"

echo "🚀 Starting performance monitoring for $SITE_URL"

# Function to measure performance
measure_performance() {
    local url="$1"
    local name="$2"

    echo "📊 Testing $name..."

    # Measure with curl
    local response
    response=$(curl -w "@-" -o /dev/null -s "$url" <<'EOF'
{
  "time_total": "%{time_total}",
  "time_namelookup": "%{time_namelookup}",
  "time_connect": "%{time_connect}",
  "time_appconnect": "%{time_appconnect}",
  "time_pretransfer": "%{time_pretransfer}",
  "time_starttransfer": "%{time_starttransfer}",
  "speed_download": "%{speed_download}",
  "size_download": "%{size_download}",
  "http_code": "%{http_code}"
}
EOF
    )

    echo "$response" | jq -r "\"$name: Total: \(.time_total)s, TTFB: \(.time_starttransfer)s, Code: \(.http_code)\""

    # Log to file for trending
    echo "$(date -Iseconds),$name,$(echo "$response" | jq -r '.time_total'),$(echo "$response" | jq -r '.time_starttransfer'),$(echo "$response" | jq -r '.http_code')" >> "$LOG_FILE"

    return 0
}

# Critical performance tests
echo "🔍 Running critical path performance tests..."

# Health endpoint (should be fastest)
measure_performance "$SITE_URL/api/health" "Health API"

# Homepage (critical rendering path)
measure_performance "$SITE_URL/" "Homepage"

# Dashboard (authenticated route)
measure_performance "$SITE_URL/dashboard" "Dashboard"

# Large page (timetable viewer)
measure_performance "$SITE_URL/gamma/timetables" "Timetables Page"

echo ""
echo "📈 Performance summary:"
echo "Target thresholds:"
echo "  - API Health: < 1s"
echo "  - Homepage: < 3s"
echo "  - Dashboard: < 5s"
echo "  - Timetables: < 7s"

# Check if we have performance degradation
if tail -10 "$LOG_FILE" 2>/dev/null | grep -q "Health API" && tail -10 "$LOG_FILE" | awk -F, '$1 ~ /Health API/ && $3 > 2.0 { exit 1 }'; then
    echo "⚠️  WARNING: Health API response time above 2s threshold"
fi

# Bundle size check (if available)
if command -v lighthouse >/dev/null 2>&1; then
    echo "🔍 Running Lighthouse audit..."
    lighthouse "$SITE_URL" --only-categories=performance --output=json --output-path=/tmp/lighthouse-report.json --chrome-flags="--headless --no-sandbox"

    # Extract key metrics
    local performance_score
    performance_score=$(jq -r '.categories.performance.score * 100' /tmp/lighthouse-report.json)
    echo "Performance Score: ${performance_score}%"

    if (( $(echo "$performance_score < 80" | bc -l) )); then
        echo "⚠️  WARNING: Performance score below 80%"
    fi
fi

echo "✅ Performance monitoring complete"
echo "📊 Full logs available at: $LOG_FILE"

# Send webhook notification if configured
if [[ -n "$WEBHOOK_URL" ]]; then
    echo "📤 Sending performance metrics to monitoring system..."
    curl -s -X POST "$WEBHOOK_URL" \
         -H "Content-Type: application/json" \
         -d "{\"source\": \"netlify-performance\", \"site\": \"$SITE_URL\", \"timestamp\": \"$(date -Iseconds)\", \"log_file\": \"$LOG_FILE\"}"
fi