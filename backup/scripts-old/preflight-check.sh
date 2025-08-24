#!/bin/bash
# preflight-check.sh - Gate 0: Pre-flight Health Check
# Run before any development or deployment work

set -e  # Exit on any error

echo "🚦 Gate 0: Pre-flight Health Check"
echo "=================================="

# Check Node version and Netlify compatibility
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node -v)
NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
NETLIFY_NODE_VERSION="22"  # From netlify.toml

if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ Node version too old (current: $NODE_VERSION, minimum: v18)"
  echo "   Update Node: nvm install node && nvm use node"
  exit 1
fi

echo "✅ Node version: $NODE_VERSION (>= v18 required)"

# Check Netlify compatibility
if [ "$NODE_MAJOR" != "$NETLIFY_NODE_VERSION" ]; then
  echo "⚠️ Node version mismatch with Netlify:"
  echo "   Local: v$NODE_MAJOR"
  echo "   Netlify: v$NETLIFY_NODE_VERSION (from netlify.toml)"
  echo "   This could cause deployment issues. Consider:"
  echo "   • Use matching version: nvm install $NETLIFY_NODE_VERSION && nvm use $NETLIFY_NODE_VERSION"
  echo "   • Or test locally with Netlify CLI: netlify build"
else
  echo "✅ Node version matches Netlify environment"
fi

# Check npm version
NPM_VERSION=$(npm -v)
echo "✅ npm version: $NPM_VERSION"

# Check for clean git status
echo "📋 Checking git repository status..."
if [[ -n $(git status --porcelain) ]]; then
  echo "⚠️ Uncommitted changes detected:"
  git status --short
  echo "   Consider committing changes before deployment"
else
  echo "✅ Git repository is clean"
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Current branch: $CURRENT_BRANCH"
if [[ "$CURRENT_BRANCH" != "main" ]] && [[ "$CURRENT_BRANCH" != "develop" ]]; then
  echo "⚠️ Not on main/develop branch - ensure you're on the right branch"
fi

# Check for multiple package managers
echo "📋 Checking package manager consistency..."
LOCK_FILES=()
if [ -f "yarn.lock" ]; then LOCK_FILES+=("yarn.lock"); fi
if [ -f "pnpm-lock.yaml" ]; then LOCK_FILES+=("pnpm-lock.yaml"); fi
if [ -f "package-lock.json" ]; then LOCK_FILES+=("package-lock.json"); fi

if [ ${#LOCK_FILES[@]} -gt 1 ]; then
  echo "❌ Multiple package managers detected: ${LOCK_FILES[*]}"
  echo "   Keep only one lockfile (recommend package-lock.json)"
  exit 1
elif [ ${#LOCK_FILES[@]} -eq 0 ]; then
  echo "❌ No package lockfile found!"
  echo "   Run: npm install"
  exit 1
fi
echo "✅ Package manager: ${LOCK_FILES[0]}"

# Check for .env files in git
echo "📋 Checking for tracked environment files..."
ENV_FILES=$(git ls-files | grep -E "\.env$|\.env\.local$" || true)
if [[ -n "$ENV_FILES" ]]; then
  echo "❌ Environment files tracked in git:"
  echo "$ENV_FILES"
  echo "   Remove with: git rm --cached <file> && echo '<file>' >> .gitignore"
  exit 1
fi
echo "✅ No environment files tracked in git"

# Check for required .env files
echo "📋 Checking for required environment files..."
if [ ! -f "packages/web-next/.env.local" ]; then
  echo "⚠️ packages/web-next/.env.local not found"
  echo "   Copy from .env.example and configure"
fi

# Check npm cache
echo "📋 Checking npm cache..."
NPM_CACHE_SIZE=$(npm cache ls 2>/dev/null | wc -l || echo "0")
echo "✅ npm cache entries: $NPM_CACHE_SIZE"

# Check for node_modules consistency
echo "📋 Checking node_modules consistency..."
if [ ! -d "node_modules" ]; then
  echo "⚠️ Root node_modules not found - run: npm ci"
elif [ ! -f "node_modules/.package-lock.json" ]; then
  echo "⚠️ node_modules may be outdated - run: npm ci"
else
  echo "✅ node_modules appears consistent"
fi

# Check disk space
echo "📋 Checking disk space..."
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo "⚠️ Disk usage high: ${DISK_USAGE}%"
  echo "   Consider cleaning: npm run clean && npm cache clean --force"
else
  echo "✅ Disk usage: ${DISK_USAGE}%"
fi

# Check for global packages that might interfere
echo "📋 Checking for potentially conflicting global packages..."
GLOBALS=$(npm list -g --depth=0 2>/dev/null | grep -E "(typescript|eslint|prettier|next)" || true)
if [[ -n "$GLOBALS" ]]; then
  echo "⚠️ Global packages detected (may conflict):"
  echo "$GLOBALS"
  echo "   Consider using npx or local versions"
fi

echo ""
echo "✅ Gate 0: Pre-flight checks completed successfully!"
echo "   Ready for development and quality checks"