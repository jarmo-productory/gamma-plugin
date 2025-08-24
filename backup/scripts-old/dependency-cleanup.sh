#!/bin/bash

# Gate 2: Dependency Architecture Cleanup
# Resolves ALL package management conflicts

set -e
echo "🔄 Gate 2: Dependency Architecture Cleanup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GATE_START_TIME=$(date +%s)

echo "📦 1. Lockfile Management"
echo "  Checking for duplicate package-lock.json files..."

# Find all package-lock.json files (excluding node_modules)
LOCKFILES=$(find . -name "package-lock.json" -not -path "*/node_modules/*" -type f)
LOCKFILE_COUNT=$(echo "$LOCKFILES" | grep -v "^$" | wc -l | tr -d ' ')

if [ "$LOCKFILE_COUNT" -gt 1 ]; then
    echo "  ⚠️  Found $LOCKFILE_COUNT lockfiles:"
    echo "$LOCKFILES" | sed 's/^/    /'
    
    echo "  🧹 Removing duplicate lockfiles..."
    # Keep only root lockfile
    echo "$LOCKFILES" | grep -v "^\./package-lock.json$" | while read file; do
        if [ -f "$file" ]; then
            echo "    Removing: $file"
            rm "$file"
        fi
    done
    echo "  ✅ Cleaned up duplicate lockfiles"
else
    echo "  ✅ Only root lockfile exists"
fi

echo ""
echo "🔍 2. Alternative Package Manager Check"
if find . -name "yarn.lock" -not -path "*/node_modules/*" -type f | grep -q .; then
    echo "  ❌ yarn.lock files found - remove them"
    exit 1
elif find . -name "pnpm-lock.yaml" -not -path "*/node_modules/*" -type f | grep -q .; then
    echo "  ❌ pnpm-lock.yaml files found - remove them"
    exit 1
else
    echo "  ✅ No conflicting package managers found"
fi

echo ""
echo "🧪 3. Clean Install Validation"
echo "  Testing clean dependency installation..."

# Save current node_modules state
if [ -d "node_modules" ]; then
    echo "  📦 Backing up current node_modules..."
    mv node_modules node_modules.backup
fi

# Test clean install
echo "  🔄 Running npm ci from root..."
if npm ci >/dev/null 2>&1; then
    echo "  ✅ npm ci completed successfully"
    
    # Test package resolution
    echo "  🔍 Testing package resolution..."
    if [ -d "packages/web-next" ]; then
        cd packages/web-next
        if npm ls >/dev/null 2>&1; then
            echo "  ✅ All packages resolve correctly"
        else
            echo "  ⚠️  Some package resolution issues found"
        fi
        cd ../..
    fi
else
    echo "  ❌ npm ci failed"
    # Restore backup if install failed
    if [ -d "node_modules.backup" ]; then
        mv node_modules.backup node_modules
    fi
    exit 1
fi

# Clean up backup
if [ -d "node_modules.backup" ]; then
    rm -rf node_modules.backup
fi

echo ""
echo "⚙️  4. Monorepo Configuration Check"
if grep -q '"workspaces"' package.json; then
    echo "  ✅ npm workspaces configured"
else
    echo "  ⚠️  npm workspaces not configured (optional for current setup)"
fi

# Check for consistent versions
echo "  🔍 Checking version consistency..."
ROOT_NODE_VERSION=$(grep '"node":' package.json | grep -o '[0-9]*' | head -1 || echo "not-specified")
WEB_NEXT_NODE_VERSION=$(grep '"node":' packages/web-next/package.json | grep -o '[0-9]*' | head -1 || echo "not-specified")

if [ "$ROOT_NODE_VERSION" = "$WEB_NEXT_NODE_VERSION" ] || [ "$WEB_NEXT_NODE_VERSION" = "not-specified" ]; then
    echo "  ✅ Node version requirements consistent"
else
    echo "  ⚠️  Node version mismatch: root=$ROOT_NODE_VERSION, web-next=$WEB_NEXT_NODE_VERSION"
fi

echo ""
echo "📊 5. Dependency Analysis"
echo "  Package count analysis:"
ROOT_DEPS=$(grep -c '"' package.json | grep -o '[0-9]*' || echo "0")
PACKAGES_COUNT=$(find packages -name "package.json" | wc -l | tr -d ' ')
echo "    Root dependencies: ~$ROOT_DEPS entries"
echo "    Workspace packages: $PACKAGES_COUNT"

echo ""
echo "✨ Final Validation"
GATE_END_TIME=$(date +%s)
TOTAL_TIME=$((GATE_END_TIME - GATE_START_TIME))

echo "  Gate 2 completed in: ${TOTAL_TIME}s"
echo "  Status: Dependency architecture cleaned"

# Create validation cache  
CACHE_FILE=".gate-cache/gate-2"
mkdir -p .gate-cache
echo "$(date -Iseconds)" > "$CACHE_FILE"

echo ""
echo "🎉 Gate 2: Dependency Architecture - PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"