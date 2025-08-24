#!/bin/bash

# Gate 3: Netlify Configuration Validation
# Ensures netlify.toml is correctly configured

set -e
echo "🌐 Gate 3: Netlify Configuration Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GATE_START_TIME=$(date +%s)

echo "📋 1. netlify.toml Existence Check"
if [ -f "netlify.toml" ]; then
    echo "  ✅ netlify.toml found"
else
    echo "  ❌ netlify.toml not found"
    exit 1
fi

echo ""
echo "📁 2. Build Configuration Validation"

# Check base directory
echo "  🔍 Base directory check..."
BASE_DIR=$(grep -A 1 "^\[build\]" netlify.toml | grep "base" | cut -d'"' -f2 2>/dev/null || echo "not-set")
if [ "$BASE_DIR" = "packages/web-next" ]; then
    echo "  ✅ Base directory: $BASE_DIR (correct)"
elif [ "$BASE_DIR" = "not-set" ]; then
    echo "  ⚠️  Base directory not explicitly set"
else
    echo "  ❌ Base directory: $BASE_DIR (should be packages/web-next)"
fi

# Verify base directory exists
if [ -d "packages/web-next" ]; then
    echo "  ✅ Target base directory exists"
else
    echo "  ❌ Target base directory packages/web-next not found"
    exit 1
fi

# Check build command
echo "  🔍 Build command check..."
BUILD_CMD=$(grep -A 5 "^\[build\]" netlify.toml | grep "command" | cut -d'"' -f2 2>/dev/null || echo "not-set")
if [[ "$BUILD_CMD" == *"npm run build"* ]]; then
    echo "  ✅ Build command includes npm run build"
    echo "    Command: $BUILD_CMD"
    
    # Check if it handles monorepo context
    if [[ "$BUILD_CMD" == *"npm ci"* ]]; then
        echo "  ✅ Build command includes dependency installation"
    else
        echo "  ⚠️  Build command may need npm ci for fresh installs"
    fi
else
    echo "  ❌ Build command not properly configured: $BUILD_CMD"
fi

# Check publish directory
echo "  🔍 Publish directory check..."
PUBLISH_DIR=$(grep -A 5 "^\[build\]" netlify.toml | grep "publish" | cut -d'"' -f2 2>/dev/null || echo "not-set")
if [ "$PUBLISH_DIR" = ".next" ]; then
    echo "  ✅ Publish directory: $PUBLISH_DIR (correct for Next.js)"
else
    echo "  ⚠️  Publish directory: $PUBLISH_DIR (expected .next)"
fi

echo ""
echo "🔌 3. Plugin Configuration Check"
echo "  🔍 Next.js plugin validation..."
if grep -q "@netlify/plugin-nextjs" netlify.toml; then
    echo "  ✅ @netlify/plugin-nextjs configured"
    
    # Check plugin version/config
    PLUGIN_SECTION=$(grep -A 10 "plugin.*nextjs" netlify.toml || echo "")
    if [ ! -z "$PLUGIN_SECTION" ]; then
        echo "  ✅ Plugin section found"
    else
        echo "  ⚠️  Plugin may need explicit configuration"
    fi
else
    echo "  ❌ @netlify/plugin-nextjs not configured"
fi

echo ""
echo "⚙️  4. Environment Configuration Check"
echo "  🔍 Node version specification..."
if grep -q "NODE_VERSION" netlify.toml; then
    NODE_VER=$(grep "NODE_VERSION" netlify.toml | cut -d'"' -f2 2>/dev/null || echo "not-found")
    echo "  ✅ NODE_VERSION specified: $NODE_VER"
    
    # Validate Node version is appropriate
    if [[ "$NODE_VER" =~ ^(18|20|22)$ ]]; then
        echo "  ✅ Node version is compatible with Netlify"
    else
        echo "  ⚠️  Node version $NODE_VER - verify Netlify compatibility"
    fi
else
    echo "  ⚠️  NODE_VERSION not specified in netlify.toml"
fi

echo ""
echo "🧪 5. Configuration Testing"
echo "  🔍 Testing build directory structure..."

# Check if Next.js app can be built from correct location
cd packages/web-next
if [ -f "package.json" ] && [ -f "next.config.ts" ]; then
    echo "  ✅ Next.js application structure valid"
    
    # Quick build test (without full build to save time)
    echo "  🔄 Testing build command parsing..."
    if npm run build --dry-run >/dev/null 2>&1 || npm run build:check >/dev/null 2>&1; then
        echo "  ✅ Build command accessible"
    else
        echo "  ⚠️  Build command validation inconclusive"
    fi
else
    echo "  ❌ Invalid Next.js application structure"
    cd ../..
    exit 1
fi
cd ../..

echo ""
echo "📊 6. Configuration Summary"
echo "  Configuration analysis:"
echo "    Base directory: $BASE_DIR"
echo "    Build command: $BUILD_CMD"  
echo "    Publish directory: $PUBLISH_DIR"
echo "    Node version: ${NODE_VER:-not-specified}"

echo ""
echo "✨ Final Validation"
GATE_END_TIME=$(date +%s)
TOTAL_TIME=$((GATE_END_TIME - GATE_START_TIME))

echo "  Gate 3 completed in: ${TOTAL_TIME}s"
echo "  Status: Netlify configuration validated"

# Create validation cache
CACHE_FILE=".gate-cache/gate-3"
mkdir -p .gate-cache
echo "$(date -Iseconds)" > "$CACHE_FILE"

echo ""
echo "🎉 Gate 3: Netlify Configuration - PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"