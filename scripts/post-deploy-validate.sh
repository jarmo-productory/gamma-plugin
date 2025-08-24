#!/bin/bash
# post-deploy-validate.sh - Gate 11: Post-Deployment Validation
# Ensure production deployment is healthy and functional

set -e  # Exit on any error

# Configuration
DEPLOY_URL=${1:-"https://productory-powerups.netlify.app"}
MAX_RETRIES=10
RETRY_DELAY=5
TIMEOUT=30

echo "📊 Gate 11: Post-Deployment Validation"
echo "======================================"
echo "🔍 Testing deployment: $DEPLOY_URL"

# Track validation results
VALIDATION_RESULTS=()
FAILED_VALIDATIONS=()

# 1. Basic connectivity test
echo "🌐 [1/8] Testing basic connectivity..."
for i in $(seq 1 $MAX_RETRIES); do
  echo "  Attempt $i/$MAX_RETRIES..."
  
  if curl -s --max-time $TIMEOUT "$DEPLOY_URL" >/dev/null 2>&1; then
    echo "✅ Deployment is accessible"
    VALIDATION_RESULTS+=("✅ Basic connectivity")
    break
  fi
  
  if [ $i -eq $MAX_RETRIES ]; then
    echo "❌ Deployment not accessible after $MAX_RETRIES attempts"
    FAILED_VALIDATIONS+=("Basic connectivity")
    # Don't exit here, continue with other tests
  else
    sleep $RETRY_DELAY
  fi
done

# 2. Health endpoint check
echo "🏥 [2/8] Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s --max-time $TIMEOUT "$DEPLOY_URL/api/health" || echo "failed")
if [[ "$HEALTH_RESPONSE" == *"healthy"* ]] || [[ "$HEALTH_RESPONSE" == *"status"* ]]; then
  echo "✅ Health endpoint responding"
  VALIDATION_RESULTS+=("✅ Health endpoint")
else
  echo "❌ Health endpoint not responding correctly"
  echo "   Response: $HEALTH_RESPONSE"
  FAILED_VALIDATIONS+=("Health endpoint")
fi

# 3. HTML content validation
echo "📄 [3/8] Validating HTML content..."
HTML_CONTENT=$(curl -s --max-time $TIMEOUT "$DEPLOY_URL" || echo "")
if [[ "$HTML_CONTENT" == *"Gamma Timetable"* ]]; then
  echo "✅ Expected HTML content found"
  VALIDATION_RESULTS+=("✅ HTML content")
else
  echo "❌ Expected HTML content not found"
  echo "   Content preview: $(echo "$HTML_CONTENT" | head -c 200)..."
  FAILED_VALIDATIONS+=("HTML content")
fi

# 4. JavaScript/CSS asset loading
echo "🎨 [4/8] Testing static asset loading..."
ASSETS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$DEPLOY_URL/_next/static/chunks/main.js" 2>/dev/null || echo "000")
if [[ "$ASSETS_STATUS" == "200" ]]; then
  echo "✅ Static assets loading"
  VALIDATION_RESULTS+=("✅ Static assets")
else
  echo "⚠️ Static assets may not be loading correctly (status: $ASSETS_STATUS)"
  # Not a hard failure as asset paths might differ
fi

# 5. Response time check
echo "⏱️ [5/8] Measuring response time..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time $TIMEOUT "$DEPLOY_URL" 2>/dev/null || echo "999")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "999")
if (( $(echo "$RESPONSE_TIME < 3.0" | bc -l 2>/dev/null || echo "0") )); then
  echo "✅ Response time: ${RESPONSE_MS}ms (< 3s)"
  VALIDATION_RESULTS+=("✅ Response time")
else
  echo "⚠️ Response time: ${RESPONSE_MS}ms (> 3s target)"
  FAILED_VALIDATIONS+=("Response time")
fi

# 6. Authentication endpoint test
echo "🔐 [6/8] Testing authentication endpoints..."
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$DEPLOY_URL/.netlify/functions/presentations-list" 2>/dev/null || echo "000")
if [[ "$AUTH_STATUS" == "401" ]]; then
  echo "✅ Authentication properly protecting endpoints"
  VALIDATION_RESULTS+=("✅ Authentication")
elif [[ "$AUTH_STATUS" == "404" ]]; then
  echo "ℹ️ Protected endpoint not found (may not be implemented yet)"
else
  echo "⚠️ Authentication endpoint unexpected status: $AUTH_STATUS"
  FAILED_VALIDATIONS+=("Authentication")
fi

# 7. Performance check with Lighthouse (if available)
echo "🚀 [7/8] Performance analysis..."
if command -v lighthouse >/dev/null 2>&1; then
  echo "  Running Lighthouse performance audit..."
  LIGHTHOUSE_OUTPUT=$(lighthouse "$DEPLOY_URL" --only-categories=performance --output=json --quiet 2>/dev/null || echo "failed")
  
  if [[ "$LIGHTHOUSE_OUTPUT" != "failed" ]]; then
    PERF_SCORE=$(echo "$LIGHTHOUSE_OUTPUT" | jq -r '.categories.performance.score // "unknown"' 2>/dev/null || echo "unknown")
    if [[ "$PERF_SCORE" != "unknown" ]]; then
      PERF_PERCENTAGE=$(echo "$PERF_SCORE * 100" | bc 2>/dev/null || echo "0")
      echo "  📊 Performance score: ${PERF_PERCENTAGE}%"
      
      if (( $(echo "$PERF_SCORE >= 0.9" | bc -l 2>/dev/null || echo "0") )); then
        echo "✅ Performance score excellent (>90%)"
        VALIDATION_RESULTS+=("✅ Performance")
      else
        echo "⚠️ Performance score below 90%"
        FAILED_VALIDATIONS+=("Performance")
      fi
    else
      echo "ℹ️ Could not parse performance score"
    fi
  else
    echo "ℹ️ Lighthouse performance check failed"
  fi
else
  echo "ℹ️ Lighthouse not available - skipping performance check"
fi

# 8. Console error check (simplified)
echo "🐛 [8/8] Checking for critical errors..."
# This is a simplified check - in a real scenario, you'd use headless browser
ERROR_INDICATORS=$(curl -s --max-time $TIMEOUT "$DEPLOY_URL" | grep -i "error\|exception\|failed" || true)
if [[ -z "$ERROR_INDICATORS" ]]; then
  echo "✅ No obvious error indicators in page content"
  VALIDATION_RESULTS+=("✅ Error check")
else
  echo "⚠️ Potential error indicators found"
  echo "   $(echo "$ERROR_INDICATORS" | head -3)"
  FAILED_VALIDATIONS+=("Error indicators")
fi

# Summary and rollback decision
echo ""
echo "📋 Post-Deployment Validation Summary"
echo "===================================="
echo "🔍 Deployment URL: $DEPLOY_URL"
echo ""

echo "✅ PASSED VALIDATIONS (${#VALIDATION_RESULTS[@]}):"
for result in "${VALIDATION_RESULTS[@]}"; do
  echo "   $result"
done

if [ ${#FAILED_VALIDATIONS[@]} -gt 0 ]; then
  echo ""
  echo "❌ FAILED VALIDATIONS (${#FAILED_VALIDATIONS[@]}):"
  for failure in "${FAILED_VALIDATIONS[@]}"; do
    echo "   - $failure"
  done
fi

# Rollback decision logic
CRITICAL_FAILURES=0
for failure in "${FAILED_VALIDATIONS[@]}"; do
  case "$failure" in
    "Basic connectivity"|"Health endpoint"|"HTML content")
      ((CRITICAL_FAILURES++))
      ;;
  esac
done

echo ""
if [ $CRITICAL_FAILURES -gt 0 ]; then
  echo "🚨 CRITICAL FAILURES DETECTED - ROLLBACK RECOMMENDED"
  echo ""
  echo "🔧 To rollback:"
  echo "   netlify deploy --restore"
  echo "   # or manually revert the problematic commit"
  echo ""
  exit 1
elif [ ${#FAILED_VALIDATIONS[@]} -gt 3 ]; then
  echo "⚠️ MULTIPLE ISSUES DETECTED - CONSIDER ROLLBACK"
  echo ""
  echo "🔧 To rollback:"
  echo "   netlify deploy --restore"
  echo ""
  exit 1
else
  echo "✅ DEPLOYMENT VALIDATION SUCCESSFUL"
  echo ""
  echo "🎉 Deployment is healthy and ready for users!"
  echo "   Monitor the deployment: netlify logs --live"
  echo "   Health check: curl $DEPLOY_URL/api/health"
  echo ""
  exit 0
fi