#!/bin/bash
# pre-build-gates.sh - Combined Gate 0 + Gate 1 for all builds
# Ensures zero defects can slip through any build process
# Smart caching to avoid redundant runs during build:all

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE_FILE="/tmp/.gamma-plugin-gates-cache"
CACHE_DURATION=300  # 5 minutes

# Check if gates ran recently (for build:all optimization)
if [ -f "$CACHE_FILE" ]; then
    CACHE_TIME=$(cat "$CACHE_FILE" 2>/dev/null || echo "0")
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - CACHE_TIME))
    
    if [ $TIME_DIFF -lt $CACHE_DURATION ]; then
        echo "🚦 Pre-Build Quality Gates (Cached)"
        echo "====================================="
        echo "✅ Gates passed recently (${TIME_DIFF}s ago) - skipping duplicate run"
        echo "🚀 Proceeding with build..."
        echo ""
        exit 0
    fi
fi

echo "🚦 Pre-Build Quality Gates"
echo "=========================="
echo "🎯 Running Gate 0 + Gate 1 before build"
echo ""

# Gate 0: Pre-flight Health Check
echo "🚦 GATE 0: Pre-flight Health Check"
echo "-----------------------------------"
if [ -x "$SCRIPT_DIR/preflight-check.sh" ]; then
    "$SCRIPT_DIR/preflight-check.sh" || {
        echo "❌ Gate 0 failed - aborting build"
        rm -f "$CACHE_FILE"
        exit 1
    }
else
    echo "❌ Gate 0 script not found or not executable"
    exit 1
fi

echo ""

# Gate 1: Strict Build & Code Quality  
echo "🚦 GATE 1: Strict Build & Code Quality"
echo "--------------------------------------"
if [ -x "$SCRIPT_DIR/strict-build-check.sh" ]; then
    "$SCRIPT_DIR/strict-build-check.sh" || {
        echo "❌ Gate 1 failed - aborting build"
        rm -f "$CACHE_FILE"
        exit 1
    }
else
    echo "❌ Gate 1 script not found or not executable"
    exit 1
fi

# Cache successful run
echo $(date +%s) > "$CACHE_FILE"

echo ""
echo "✅ ALL PRE-BUILD GATES PASSED!"
echo "🚀 Proceeding with build..."
echo ""