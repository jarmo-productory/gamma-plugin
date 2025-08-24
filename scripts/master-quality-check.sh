#!/bin/bash
# master-quality-check.sh - Master Quality Validation
# Run ALL quality gates in sequence before deployment

set -e  # Exit on first error

echo "🚀 Master Quality Validation Pipeline"
echo "====================================="
echo "🎯 Goal: Zero defects, production-ready deployment"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
START_TIME=$(date +%s)

# Track failed gates
FAILED_GATES=()
PASSED_GATES=()

# Helper function to run a gate
run_gate() {
  local gate_name="$1"
  local script_path="$2"
  local gate_number="$3"
  
  echo "🚦 Gate $gate_number: $gate_name"
  echo "$(printf '=%.0s' {1..50})"
  
  if [ -x "$script_path" ]; then
    if "$script_path"; then
      echo "✅ Gate $gate_number PASSED: $gate_name"
      PASSED_GATES+=("Gate $gate_number: $gate_name")
    else
      echo "❌ Gate $gate_number FAILED: $gate_name"
      FAILED_GATES+=("Gate $gate_number: $gate_name")
      return 1
    fi
  else
    echo "⚠️ Gate $gate_number SKIPPED: Script not found or not executable: $script_path"
    FAILED_GATES+=("Gate $gate_number: $gate_name (missing script)")
    return 1
  fi
  
  echo ""
}

# Change to project root
cd "$ROOT_DIR"

echo "📁 Working directory: $(pwd)"
echo "🕐 Started at: $(date)"
echo ""

# Gate 0: Pre-flight Health Check
run_gate "Pre-flight Health Check" "$SCRIPT_DIR/preflight-check.sh" "0" || true

# Gate 2: Dependency Cleanup (run before build)
run_gate "Dependency Architecture Cleanup" "$SCRIPT_DIR/dependency-cleanup.sh" "2" || true

# Gate 1: Strict Build Validation
run_gate "Strict Build & Code Quality" "$SCRIPT_DIR/strict-build-check.sh" "1" || true

# Gate 1.5: Pre-deployment Test Suite
run_gate "Pre-deployment Test Suite" "$SCRIPT_DIR/pre-deployment-suite.sh" "1.5" || true

# Gate 3: Netlify Configuration (dry run)
echo "🚦 Gate 3: Netlify Configuration Validation"
echo "$(printf '=%.0s' {1..50})"
if command -v netlify >/dev/null 2>&1; then
  if netlify build --dry >/dev/null 2>&1; then
    echo "✅ Gate 3 PASSED: Netlify Configuration"
    PASSED_GATES+=("Gate 3: Netlify Configuration")
  else
    echo "❌ Gate 3 FAILED: Netlify Configuration"
    echo "   Run: netlify build --dry"
    FAILED_GATES+=("Gate 3: Netlify Configuration")
  fi
else
  echo "⚠️ Gate 3 SKIPPED: Netlify CLI not installed"
  echo "   Install with: npm install -g netlify-cli"
  FAILED_GATES+=("Gate 3: Netlify Configuration (CLI missing)")
fi
echo ""

# Calculate execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))
EXECUTION_MIN=$((EXECUTION_TIME / 60))
EXECUTION_SEC=$((EXECUTION_TIME % 60))

# Final Summary
echo "📋 Master Quality Validation Summary"
echo "===================================="
echo "🕐 Total execution time: ${EXECUTION_MIN}m ${EXECUTION_SEC}s"
echo "📊 Gates executed: $((${#PASSED_GATES[@]} + ${#FAILED_GATES[@]}))"
echo ""

if [ ${#PASSED_GATES[@]} -gt 0 ]; then
  echo "✅ PASSED GATES (${#PASSED_GATES[@]}):"
  for gate in "${PASSED_GATES[@]}"; do
    echo "   ✅ $gate"
  done
  echo ""
fi

if [ ${#FAILED_GATES[@]} -eq 0 ]; then
  echo "🎉 ALL QUALITY GATES PASSED!"
  echo ""
  echo "🚀 Your code is production-ready. You can now:"
  echo "   • Push to main branch:     git push origin main"
  echo "   • Deploy to preview:       npm run deploy:preview"
  echo "   • Deploy to production:    npm run deploy:production"
  echo ""
  echo "📊 Quality Metrics Achieved:"
  echo "   ✅ Zero TypeScript errors"
  echo "   ✅ Zero ESLint warnings"
  echo "   ✅ All unit tests passing"
  echo "   ✅ Successful build generation"
  echo "   ✅ Dependencies clean and secure"
  echo "   ✅ No circular dependencies"
  echo "   ✅ Build time optimized"
  echo ""
  exit 0
else
  echo "❌ FAILED GATES (${#FAILED_GATES[@]}):"
  for gate in "${FAILED_GATES[@]}"; do
    echo "   ❌ $gate"
  done
  echo ""
  echo "🔧 NEXT STEPS:"
  echo "   1. Fix the issues identified in failed gates"
  echo "   2. Run individual gate scripts to debug:"
  echo "      • npm run quality:preflight"
  echo "      • npm run quality:deps"
  echo "      • npm run quality:build"
  echo "      • npm run quality:pre-deploy"
  echo "   3. Re-run this master validation:"
  echo "      • npm run quality:all"
  echo ""
  echo "⚠️ DO NOT DEPLOY until all gates pass!"
  exit 1
fi