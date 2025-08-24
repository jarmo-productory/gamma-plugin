#!/bin/bash
# pre-deployment-suite.sh - Gate 1.5: Pre-Deployment Test Suite
# Comprehensive quality assurance before deployment

set -e  # Exit on any error

echo "🧪 Gate 1.5: Pre-Deployment Test Suite"
echo "======================================"

cd "$(git rev-parse --show-toplevel)"  # Go to repository root

# Track failed checks
FAILED_CHECKS=()

# 1. Dependency integrity check
echo "📦 [1/10] Dependency integrity check..."
if npm ls --depth=0 >/dev/null 2>&1; then
  echo "✅ Dependency tree is consistent"
else
  echo "❌ Dependency tree has issues"
  FAILED_CHECKS+=("Dependency integrity")
fi

# 2. Security audit
echo "🔒 [2/10] Security vulnerability scan..."
if npm audit --audit-level=moderate >/dev/null 2>&1; then
  echo "✅ No moderate/high security vulnerabilities"
else
  echo "⚠️ Security vulnerabilities found"
  npm audit --audit-level=moderate | head -20
  FAILED_CHECKS+=("Security vulnerabilities")
fi

# 3. TypeScript compilation
echo "⚡ [3/10] TypeScript compilation check..."
if npx tsc --noEmit --strict; then
  echo "✅ TypeScript compilation successful"
else
  echo "❌ TypeScript compilation errors"
  FAILED_CHECKS+=("TypeScript compilation")
fi

# 4. Linting validation
echo "🔧 [4/10] ESLint validation..."
if npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0 --quiet; then
  echo "✅ ESLint validation passed"
else
  echo "❌ ESLint errors/warnings found"
  FAILED_CHECKS+=("ESLint validation")
fi

# 5. Unit tests
echo "🧪 [5/10] Running unit tests..."
if npm run test:run >/dev/null 2>&1; then
  echo "✅ Unit tests passed"
else
  echo "❌ Unit tests failed"
  npm run test:run | tail -20
  FAILED_CHECKS+=("Unit tests")
fi

# 6. Build validation with timing
echo "🏗️ [6/10] Build validation..."
START_TIME=$(date +%s)
if cd packages/web-next && npm run build >/dev/null 2>&1; then
  END_TIME=$(date +%s)
  BUILD_TIME=$((END_TIME - START_TIME))
  echo "✅ Build successful (${BUILD_TIME}s)"
  
  if [ $BUILD_TIME -gt 60 ]; then
    echo "⚠️ Build time exceeded 60s target"
    FAILED_CHECKS+=("Build time")
  fi
else
  echo "❌ Build failed"
  FAILED_CHECKS+=("Build validation")
fi
cd ../..

# 7. Bundle size check
echo "📊 [7/10] Bundle size analysis..."
if [ -d "packages/web-next/.next" ]; then
  BUNDLE_SIZE=$(du -sk packages/web-next/.next | cut -f1)
  BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024))
  echo "📦 Bundle size: ${BUNDLE_SIZE_MB}MB"
  
  if [ $BUNDLE_SIZE -gt 5120 ]; then  # 5MB in KB
    echo "⚠️ Bundle size exceeds 5MB limit"
    FAILED_CHECKS+=("Bundle size")
  else
    echo "✅ Bundle size within limits"
  fi
else
  echo "❌ Build output not found"
  FAILED_CHECKS+=("Bundle size check")
fi

# 8. Circular dependencies check
echo "🔄 [8/10] Checking for circular dependencies..."
if command -v npx madge >/dev/null 2>&1; then
  if npx madge --circular packages/web-next/src --quiet; then
    echo "❌ Circular dependencies detected"
    npx madge --circular packages/web-next/src
    FAILED_CHECKS+=("Circular dependencies")
  else
    echo "✅ No circular dependencies"
  fi
else
  echo "ℹ️ madge not available - skipping circular dependency check"
fi

# 9. Environment configuration check
echo "🌍 [9/10] Environment configuration check..."
ENV_ISSUES=0
if [ ! -f "packages/web-next/.env.local" ]; then
  echo "⚠️ packages/web-next/.env.local missing"
  ENV_ISSUES=1
fi

if [ ! -f "netlify.toml" ]; then
  echo "⚠️ netlify.toml missing"
  ENV_ISSUES=1
fi

if [ $ENV_ISSUES -eq 0 ]; then
  echo "✅ Environment configuration looks good"
else
  echo "⚠️ Environment configuration issues detected"
  FAILED_CHECKS+=("Environment configuration")
fi

# 10. Critical file existence check
echo "📄 [10/10] Critical files check..."
CRITICAL_FILES=(
  "packages/web-next/next.config.ts"
  "packages/web-next/package.json"
  "packages/shared/package.json"
  "netlify.toml"
)

MISSING_FILES=()
for file in "${CRITICAL_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
  echo "✅ All critical files present"
else
  echo "❌ Missing critical files: ${MISSING_FILES[*]}"
  FAILED_CHECKS+=("Critical files")
fi

# Summary
echo ""
echo "📋 Pre-Deployment Test Suite Summary"
echo "===================================="

if [ ${#FAILED_CHECKS[@]} -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED - Ready for deployment!"
  echo ""
  echo "🚀 You can now run:"
  echo "   git push origin main        (for auto-deployment)"
  echo "   npm run deploy:preview      (for preview deployment)"
  echo "   npm run deploy:production   (for manual production deployment)"
  exit 0
else
  echo "❌ FAILED CHECKS (${#FAILED_CHECKS[@]}):"
  for check in "${FAILED_CHECKS[@]}"; do
    echo "   - $check"
  done
  echo ""
  echo "🔧 Fix the above issues before deployment"
  echo "   Run individual scripts to debug:"
  echo "   npm run quality:preflight"
  echo "   npm run quality:build"
  echo "   npm run quality:deps"
  exit 1
fi