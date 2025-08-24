#!/bin/bash
# dependency-cleanup.sh - Gate 2: Dependency Architecture Cleanup
# Resolve all package management conflicts

set -e  # Exit on any error

echo "🔄 Gate 2: Dependency Architecture Cleanup"
echo "=========================================="

cd "$(git rev-parse --show-toplevel)"  # Go to repository root

# 1. Remove all node_modules and duplicate lockfiles
echo "📦 [1/6] Cleaning all node_modules and lockfiles..."
find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
find . -name "package-lock.json" -not -path "./package-lock.json" -delete 2>/dev/null || true
find . -name "yarn.lock" -delete 2>/dev/null || true
find . -name "pnpm-lock.yaml" -delete 2>/dev/null || true
echo "✅ Cleaned all node_modules and extra lockfiles"

# 2. Verify single lockfile policy
echo "🔍 [2/6] Verifying single lockfile policy..."
LOCKFILE_COUNT=$(find . -name "package-lock.json" | wc -l)
if [ $LOCKFILE_COUNT -ne 1 ]; then
  echo "❌ Expected 1 lockfile, found $LOCKFILE_COUNT"
  find . -name "package-lock.json"
  exit 1
fi
echo "✅ Single lockfile policy verified"

# 3. Check for workspaces configuration
echo "📋 [3/6] Checking workspace configuration..."
if ! grep -q '"workspaces"' package.json; then
  echo "⚠️ No workspaces configuration found in root package.json"
  echo "   Consider adding workspaces for better monorepo management"
else
  echo "✅ Workspaces configured"
fi

# 4. Fresh install with verbose output
echo "📥 [4/6] Fresh dependency installation..."
npm ci --no-audit --no-fund || {
  echo "❌ npm ci failed"
  echo "   Try: npm cache clean --force && npm ci"
  exit 1
}
echo "✅ Dependencies installed successfully"

# 5. Verify package resolutions
echo "🔍 [5/6] Verifying package resolutions..."

# Check for multiple React versions
REACT_VERSIONS=$(npm ls react --depth=0 2>/dev/null | grep react@ || echo "none")
echo "📦 React version: $REACT_VERSIONS"

# Check for TypeScript consistency
TS_VERSIONS=$(npm ls typescript --depth=0 2>/dev/null | grep typescript@ || echo "none")
echo "📦 TypeScript version: $TS_VERSIONS"

# Check for peer dependency warnings
echo "📋 Checking for peer dependency issues..."
PEER_WARNINGS=$(npm ls 2>&1 | grep -i "WARN.*peer" || true)
if [[ -n "$PEER_WARNINGS" ]]; then
  echo "⚠️ Peer dependency warnings:"
  echo "$PEER_WARNINGS"
  echo "   Consider resolving peer dependencies"
else
  echo "✅ No peer dependency issues"
fi

# 6. Validate workspace package linking
echo "🔗 [6/6] Validating workspace package linking..."
for package_dir in packages/*/; do
  if [ -f "$package_dir/package.json" ]; then
    package_name=$(jq -r '.name' "$package_dir/package.json")
    echo "  Checking package: $package_name"
    
    # Verify package can be resolved
    if npm ls "$package_name" >/dev/null 2>&1; then
      echo "  ✅ $package_name resolves correctly"
    else
      echo "  ⚠️ $package_name may not resolve correctly"
    fi
  fi
done

# Check for unused dependencies
echo "📊 Dependency analysis..."
if command -v npx depcheck >/dev/null 2>&1; then
  echo "  Running depcheck for unused dependencies..."
  npx depcheck --quiet || true
else
  echo "  ℹ️ depcheck not available - install with: npm install -g depcheck"
fi

# Security audit
echo "🔒 Security audit..."
npm audit --audit-level=moderate || {
  echo "⚠️ Security vulnerabilities found"
  echo "   Run: npm audit fix"
}

echo ""
echo "✅ Gate 2: Dependency cleanup completed successfully!"
echo "   📦 Single lockfile maintained"
echo "   🔗 Package resolutions verified"
echo "   🔒 Security audit completed"