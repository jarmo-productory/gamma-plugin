#!/bin/bash
# strict-build-check.sh - Gate 1: Strict Build & Code Quality
# Zero tolerance for warnings and errors

set -e  # Exit on any error

echo "✅ Gate 1: Strict Build & Code Quality Check"
echo "============================================"

# 1. Clean state
echo "📦 [1/10] Cleaning workspace..."
rm -rf packages/web-next/.next packages/extension/dist packages/shared/dist
rm -rf packages/web-next/package-lock.json  # Ensure no duplicate lockfiles
echo "✅ Workspace cleaned"

# 2. Fresh install from root
echo "📥 [2/10] Installing dependencies..."
cd "$(git rev-parse --show-toplevel)"  # Go to repository root
npm ci --no-audit --no-fund
echo "✅ Dependencies installed"

# 3. TypeScript strict check
echo "🔍 [3/10] TypeScript strict validation..."

# Check only web-next package in its own directory
echo "  Checking web-next package..."
if [ -f "packages/web-next/tsconfig.json" ]; then
  cd packages/web-next
  # Only check files in this package's src directory
  npx tsc --noEmit --skipLibCheck || {
    echo "❌ TypeScript errors in web-next package"
    echo "   Fix the TypeScript issues above before building"
    cd ../..
    exit 1
  }
  cd ../..
  echo "✅ Web-next TypeScript validation passed"
else
  echo "  ℹ️ Web-next package has no tsconfig.json - skipping"
fi

# Check extension package separately if it exists
echo "  Checking extension package..."
if [ -f "packages/extension/tsconfig.json" ]; then
  cd packages/extension
  npx tsc --noEmit --skipLibCheck || {
    echo "❌ TypeScript errors in extension package"
    echo "   Fix the TypeScript issues above before building"
    cd ../..
    exit 1
  }
  cd ../..
  echo "✅ Extension TypeScript validation passed"
else
  echo "  ℹ️ Extension package has no tsconfig.json - skipping"
fi

echo "✅ TypeScript validation passed"

# 4. ESLint strict check
echo "🔧 [4/10] ESLint validation (zero warnings allowed)..."
npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0 || {
  echo "❌ ESLint errors/warnings found"
  echo "   Run: npm run lint:fix"
  exit 1
}
echo "✅ ESLint validation passed"

# 5. Prettier format check
echo "💅 [5/10] Prettier format check..."
npx prettier --check . || {
  echo "❌ Code formatting issues found"
  echo "   Run: npm run format"
  exit 1
}
echo "✅ Code formatting is consistent"

# 6. Build shared package first
echo "🏗️ [6/10] Building shared package..."
cd packages/shared
npm run build || {
  echo "❌ Shared package build failed"
  exit 1
}
echo "✅ Shared package built successfully"

# 7. Build extension
echo "🏗️ [7/10] Building extension..."
cd ../extension
npm run build || {
  echo "❌ Extension build failed"
  exit 1
}
echo "✅ Extension built successfully"

# 8. Build web-next with timing
echo "🚀 [8/10] Building Next.js app..."
cd ../web-next
START_TIME=$(date +%s)
npm run build 2>&1 | tee build.log || {
  echo "❌ Next.js build failed"
  echo "Build log:"
  cat build.log | tail -20
  exit 1
}
END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))

if [ $BUILD_TIME -gt 60 ]; then
  echo "⚠️ Build time: ${BUILD_TIME}s (target: <60s)"
else
  echo "✅ Build time: ${BUILD_TIME}s"
fi

# 9. Check for build warnings
echo "🔍 [9/10] Checking for build warnings..."
if grep -q "Warning:" build.log; then
  echo "❌ Build warnings detected:"
  grep "Warning:" build.log
  exit 1
fi
echo "✅ No build warnings"

# 10. Validate build output
echo "📊 [10/10] Validating build output..."
if [ ! -d ".next" ]; then
  echo "❌ .next directory not created"
  exit 1
fi

# Check bundle size (approximate)
BUNDLE_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "unknown")
echo "📦 Bundle size: $BUNDLE_SIZE"

# Check for required files
REQUIRED_FILES=(
  ".next/BUILD_ID"
  ".next/static"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -e "$file" ]; then
    echo "❌ Required build file missing: $file"
    exit 1
  fi
done

# Clean up build log
rm -f build.log

cd ../..
echo ""
echo "✅ Gate 1: Strict build validation completed successfully!"
echo "   📊 Build time: ${BUILD_TIME}s"
echo "   📦 Bundle size: $BUNDLE_SIZE"
echo "   🎯 Zero errors, zero warnings achieved"