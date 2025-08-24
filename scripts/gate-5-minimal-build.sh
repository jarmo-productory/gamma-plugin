#!/bin/bash

# Gate 5: Minimal Build Test
# Safely test minimal Next.js deployment without affecting main codebase

set -e
echo "🔧 Gate 5: Minimal Build Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GATE_START_TIME=$(date +%s)

echo "📋 1. Current Branch Verification"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "gate-5-minimal-build" ]; then
    echo "  ❌ Must be on gate-5-minimal-build branch (current: $CURRENT_BRANCH)"
    exit 1
fi
echo "  ✅ On safe testing branch: $CURRENT_BRANCH"

echo ""
echo "💾 2. Backup Current State"
echo "  🔄 Creating backup of current package.json..."
cd packages/web-next
cp package.json package.json.backup
cp src/app/page.tsx src/app/page.tsx.backup
echo "  ✅ Backup created"

echo ""
echo "🎯 3. Progressive Minimal Build Testing"

echo "  📦 Stage 1: Basic Next.js (Core only)"
echo "    Installing minimal dependencies..."
cp package.minimal.json package.json
npm install --silent

echo "    Creating minimal page..."
cp src/app/page.minimal.tsx src/app/page.tsx

echo "    Testing minimal build..."
if npm run build >/dev/null 2>&1; then
    echo "    ✅ Stage 1 PASSED: Basic Next.js builds successfully"
    STAGE1_SUCCESS=true
else
    echo "    ❌ Stage 1 FAILED: Basic Next.js build failed"
    STAGE1_SUCCESS=false
fi

if [ "$STAGE1_SUCCESS" = true ]; then
    echo ""
    echo "  📊 Stage 2: Build Analysis"
    echo "    Analyzing build output..."
    
    if [ -d ".next" ]; then
        BUILD_SIZE=$(du -sh .next | cut -f1)
        echo "    📏 Build size: $BUILD_SIZE"
        
        if [ -f ".next/static" ]; then
            STATIC_FILES=$(find .next/static -type f | wc -l)
            echo "    📁 Static files: $STATIC_FILES"
        fi
        
        echo "    ✅ Stage 2 PASSED: Build analysis complete"
    else
        echo "    ❌ Stage 2 FAILED: No .next directory found"
    fi
    
    echo ""
    echo "  🌐 Stage 3: Start Server Test"
    echo "    Testing server startup..."
    
    # Start server in background and test
    npm run start &
    SERVER_PID=$!
    sleep 10
    
    # Test if server responds (with retries)
    RETRY_COUNT=0
    MAX_RETRIES=3
    SERVER_READY=false
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$SERVER_READY" = false ]; do
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            SERVER_READY=true
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            sleep 2
        fi
    done
    
    if [ "$SERVER_READY" = true ]; then
        echo "    ✅ Stage 3 PASSED: Server starts and responds"
        STAGE3_SUCCESS=true
    else
        echo "    ❌ Stage 3 FAILED: Server not responding"
        STAGE3_SUCCESS=false
    fi
    
    # Clean up server
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    
else
    echo "    ⏭️ Skipping subsequent stages due to Stage 1 failure"
    STAGE3_SUCCESS=false
fi

echo ""
echo "🔄 4. Restoration"
echo "  🔙 Restoring original files..."
cp package.json.backup package.json
cp src/app/page.tsx.backup src/app/page.tsx
rm -f package.json.backup src/app/page.tsx.backup
rm -f package.minimal.json src/app/page.minimal.tsx
echo "  ✅ Original state restored"

echo ""
echo "📊 5. Results Summary"
GATE_END_TIME=$(date +%s)
TOTAL_TIME=$((GATE_END_TIME - GATE_START_TIME))

echo "  Test Duration: ${TOTAL_TIME}s"
echo "  Stage 1 (Basic Build): $([ "$STAGE1_SUCCESS" = true ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "  Stage 3 (Server Test): $([ "$STAGE3_SUCCESS" = true ] && echo "✅ PASS" || echo "❌ FAIL")"

# Overall result
if [ "$STAGE1_SUCCESS" = true ] && [ "$STAGE3_SUCCESS" = true ]; then
    echo ""
    echo "🎉 Gate 5: Minimal Build Test - PASSED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Minimal Next.js deployment confirmed working"
    echo "🚀 Ready to test progressive feature addition"
    
    # Create validation cache
    cd ../..
    CACHE_FILE=".gate-cache/gate-5"
    mkdir -p .gate-cache
    echo "$(date -Iseconds)" > "$CACHE_FILE"
    
    exit 0
else
    echo ""
    echo "❌ Gate 5: Minimal Build Test - FAILED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔧 Basic Next.js build issues detected"
    echo "💡 Check Node.js version, npm dependencies, and Next.js configuration"
    
    exit 1
fi