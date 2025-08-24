# Netlify Deployment Diagnostic Roadmap
## Strategic Gates to Identify & Fix Build Failure

### 🎯 Goal: Achieve Successful Netlify Deployment with Zero Errors

---

## GATE 0: Pre-Flight Health Check 🚦
**Objective:** Establish baseline health before any deployment attempts

### Repository Integrity
- [ ] Git status clean (no uncommitted changes)
- [ ] On correct branch (main/production)
- [ ] No merge conflicts
- [ ] `.gitignore` properly configured
- [ ] No sensitive data in repository

### Development Environment
- [ ] Node version matches production (v20.x)
- [ ] npm version >= 10.x
- [ ] No global packages interfering
- [ ] Clean npm cache (`npm cache clean --force`)
- [ ] No conflicting .npmrc configurations

### Quick Smoke Tests
```bash
#!/bin/bash
# preflight-check.sh

# Check Node version
NODE_VERSION=$(node -v)
if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
  echo "❌ Node version must be v20.x (current: $NODE_VERSION)"
  exit 1
fi

# Check for clean git status
if [[ -n $(git status --porcelain) ]]; then
  echo "⚠️ Uncommitted changes detected"
fi

# Check for multiple package managers
if [ -f "yarn.lock" ] || [ -f "pnpm-lock.yaml" ]; then
  echo "❌ Multiple package managers detected!"
  exit 1
fi

# Check for .env files in git
if git ls-files | grep -E "\.env$|\.env\.local$"; then
  echo "❌ Environment files tracked in git!"
  exit 1
fi

echo "✅ Pre-flight checks passed"
```

---

## GATE 1: Local Build Validation & Code Quality ✅
**Objective:** Ensure Next.js builds successfully with ZERO warnings/errors

### Core Build Checks
- [ ] Run `npm run build` in packages/web-next
- [ ] Verify NO TypeScript errors (`npx tsc --noEmit`)
- [ ] Confirm .next folder generated
- [ ] ZERO dependency warnings
- [ ] NO multiple lockfile warnings
- [ ] NO webpack cache issues

### Code Quality Gates (Strict Mode)
- [ ] **ESLint:** `npm run lint` - ZERO errors, ZERO warnings
- [ ] **TypeScript Strict:** Full strict mode enabled in tsconfig.json
- [ ] **Prettier:** `npm run format:check` - All files formatted
- [ ] **Import Sort:** No circular dependencies (`npx madge --circular`)
- [ ] **Bundle Analysis:** Check bundle size (`npx next-bundle-analyzer`)
- [ ] **Unused Dependencies:** `npx depcheck` - No unused packages
- [ ] **Security Audit:** `npm audit` - No high/critical vulnerabilities
- [ ] **License Check:** Verify all dependencies have compatible licenses

### Monorepo Health Checks
- [ ] **Single Lockfile:** Only ONE package-lock.json at root level
- [ ] **Workspace Resolution:** All packages resolve correctly
- [ ] **Shared Package Build:** `@gamma-timetable/shared` builds independently
- [ ] **No Phantom Dependencies:** Dependencies explicitly declared
- [ ] **Clean Install:** `rm -rf node_modules && npm ci` works from root

### Performance Checks
- [ ] **Build Time:** < 60 seconds for production build
- [ ] **Bundle Size:** Main bundle < 200KB (gzipped)
- [ ] **Lighthouse Score:** Performance > 90
- [ ] **No Memory Leaks:** Build completes without heap errors
- [ ] **Tree Shaking:** Verify dead code elimination working

### Pre-commit Validation Script
```bash
#!/bin/bash
# strict-build-check.sh

set -e  # Exit on any error

echo "🔍 Starting strict quality checks..."

# 1. Clean state
echo "📦 Cleaning workspace..."
rm -rf node_modules packages/*/node_modules
rm -rf .next packages/*/.next
rm -rf packages/web-next/package-lock.json  # Ensure no duplicate

# 2. Fresh install
echo "📥 Installing dependencies..."
npm ci

# 3. TypeScript check
echo "✅ TypeScript validation..."
npx tsc --noEmit

# 4. Linting
echo "🔧 ESLint check..."
npm run lint

# 5. Format check
echo "💅 Prettier check..."
npm run format:check || echo "Run 'npm run format' to fix"

# 6. Build shared first
echo "🏗️ Building shared package..."
cd packages/shared && npm run build && cd ../..

# 7. Build web-next
echo "🚀 Building Next.js app..."
cd packages/web-next && npm run build

# 8. Security audit
echo "🔒 Security audit..."
npm audit --audit-level=high

# 9. Circular dependency check
echo "🔄 Checking for circular dependencies..."
npx madge --circular src/

# 10. Bundle size check
echo "📊 Analyzing bundle size..."
npx next-bundle-analyzer

echo "✅ All quality checks passed!"
```

### QA-Enhanced Testing Suite
- [ ] **E2E Critical Paths:** Landing, auth flow, dashboard load
- [ ] **API Validation:** All endpoints return correct status codes
- [ ] **Accessibility:** WCAG 2.1 AA compliance via @axe-core/playwright
- [ ] **Performance Benchmarks:** Lighthouse score > 90, FCP < 1.5s
- [ ] **Security Scanning:** Trivy/Snyk for vulnerability detection
- [ ] **Visual Regression:** Percy/Chromatic for UI consistency

### Test Coverage Requirements
- [ ] **Unit Tests:** 80% minimum coverage
- [ ] **Integration Tests:** All API endpoints covered
- [ ] **E2E Tests:** Critical user journeys covered
- [ ] **Load Testing:** 100 concurrent users supported

**Status:** ⚠️ Multiple issues to resolve:
- Multiple lockfiles detected
- Webpack cache warnings
- Missing quality scripts in package.json
- Test coverage below 80%

---

## GATE 1.5: Advanced QA Validation (NEW) 🧪
**Objective:** Comprehensive quality assurance before deployment

### Automated Test Execution
- [ ] Run pre-deployment test suite (`npm run quality:pre-deploy`)
- [ ] Execute critical path E2E tests
- [ ] Validate all API endpoints
- [ ] Check accessibility compliance
- [ ] Verify bundle size limits

### Performance Validation
- [ ] Lighthouse score > 90 for all categories
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Bundle size main chunk < 100KB
- [ ] No memory leaks detected

### Security & Compliance
- [ ] No high/critical vulnerabilities (`npm audit`)
- [ ] No exposed secrets in code
- [ ] OWASP Top 10 compliance
- [ ] Content Security Policy configured
- [ ] Rate limiting implemented

### Pre-commit Hooks
```bash
# Install husky and lint-staged
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

---

## GATE 2: Dependency Architecture Cleanup 🔄
**Objective:** Resolve ALL package management conflicts

### Lockfile Management
- [ ] Remove duplicate package-lock.json in packages/web-next
- [ ] Ensure ONLY root package-lock.json exists
- [ ] Add .gitignore rule: `packages/*/package-lock.json`
- [ ] Verify no yarn.lock or pnpm-lock.yaml files

### Dependency Consolidation
- [ ] Move shared dependencies to root package.json
- [ ] Use workspace protocol for internal packages
- [ ] Deduplicate React versions (single version across all packages)
- [ ] Align TypeScript versions across packages
- [ ] Consolidate build tool versions (Next.js, Vite, etc.)

### Clean Install Validation
- [ ] `rm -rf node_modules packages/*/node_modules`
- [ ] `npm ci` from root completes without warnings
- [ ] All packages resolve correctly
- [ ] No peer dependency warnings
- [ ] No deprecated package warnings

### Monorepo Configuration
- [ ] Add npm workspaces configuration to root package.json
- [ ] Configure proper hoisting rules
- [ ] Set up shared TypeScript config inheritance
- [ ] Define consistent Node/npm version requirements

**Validation Script:**
```bash
#!/bin/bash
# dependency-cleanup.sh

# Remove all node_modules and lockfiles
find . -name "node_modules" -type d -prune -exec rm -rf {} +
find . -name "package-lock.json" -not -path "./package-lock.json" -delete

# Fresh install
npm ci

# Verify single lockfile
if [ $(find . -name "package-lock.json" | wc -l) -ne 1 ]; then
  echo "❌ Multiple lockfiles detected!"
  exit 1
fi

echo "✅ Dependency cleanup successful"
```

---

## GATE 3: Netlify Configuration Validation
**Objective:** Ensure netlify.toml is correctly configured
- [ ] Verify base directory (packages/web-next)
- [ ] Check build command (npm ci && npm run build)
- [ ] Confirm publish directory (.next)
- [ ] Validate Next.js plugin configuration

**Current Config Review:**
- Base: ✅ packages/web-next
- Command: ⚠️ May need adjustment for monorepo
- Publish: ✅ .next
- Plugin: ✅ @netlify/plugin-nextjs

---

## GATE 4: Environment Variables Audit
**Objective:** Ensure all required env vars are set in Netlify
- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (public)
- [ ] CLERK_SECRET_KEY (secret, in Netlify UI)
- [ ] Any Supabase keys if needed
- [ ] NODE_VERSION specification

**Verification Steps:**
1. Check Netlify UI for all env vars
2. Verify CLERK_SECRET_KEY is set (not in netlify.toml)
3. Consider adding NODE_VERSION=20 to build.environment

---

## GATE 5: Minimal Build Test
**Objective:** Strip to bare minimum that builds
- [ ] Create branch with minimal Next.js app
- [ ] Remove all complex dependencies temporarily
- [ ] Test deployment of minimal version
- [ ] Gradually add features back

**Progressive Addition Order:**
1. Basic Next.js pages
2. Clerk authentication
3. Shared packages
4. UI components
5. Full functionality

---

## GATE 6: Build Command Optimization
**Objective:** Adjust build command for monorepo context
- [ ] Test: `cd ../.. && npm ci && cd packages/web-next && npm run build`
- [ ] Alternative: `npm ci --prefix ../.. && npm run build`
- [ ] Consider: `npx turbo run build --filter=web-next`
- [ ] Fallback: Custom build script at root

**Test Sequence:**
1. Simple npm ci && npm run build
2. Root-level dependency install first
3. Turbo/workspace-aware build
4. Custom shell script

---

## GATE 7: Cache & State Management
**Objective:** Clear Netlify build cache and state
- [ ] Clear build cache in Netlify UI
- [ ] Trigger fresh deploy without cache
- [ ] Check for .netlify folder issues
- [ ] Verify no stale lock files in repo

**Actions:**
1. Netlify UI → Site Settings → Clear cache
2. Push empty commit to trigger rebuild
3. Monitor build logs for cache-related errors

---

## GATE 8: Direct Netlify CLI Testing
**Objective:** Replicate Netlify environment locally
- [ ] Install Netlify CLI: `npm install -g netlify-cli`
- [ ] Run: `netlify build` from project root
- [ ] Compare local vs remote build logs
- [ ] Test: `netlify deploy --build`

**Debug Commands:**
```bash
netlify build --debug
netlify deploy --build --prod
netlify env:list
```

---

## GATE 9: Package Resolution Strategy
**Objective:** Fix shared package import issues
- [ ] Verify @gamma-timetable/shared builds correctly
- [ ] Check React version consistency
- [ ] Ensure no circular dependencies
- [ ] Test shared package in isolation

**Validation:**
1. Build shared package first
2. Check exported modules
3. Verify import paths in web-next
4. Consider bundling shared into web-next

---

## GATE 10: Final Deployment Protocol
**Objective:** Establish reliable deployment process
- [ ] Document working build command
- [ ] Create deployment checklist
- [ ] Set up monitoring/alerts
- [ ] Establish rollback procedure

**Success Criteria:**
- ✅ Automatic deployment on push to main
- ✅ Build completes in < 5 minutes
- ✅ No manual intervention required
- ✅ Preview deploys working

---

## GATE 11: Post-Deployment Validation & Monitoring 📊
**Objective:** Ensure production deployment is healthy

### Immediate Post-Deploy Checks (< 5 min)
- [ ] Health endpoint responds with 200 status
- [ ] Authentication flow functional
- [ ] Critical pages load without errors
- [ ] No console errors in browser
- [ ] API endpoints responding

### Performance Monitoring
- [ ] Real User Monitoring (RUM) setup
- [ ] Error tracking (Sentry/Rollbar)
- [ ] Performance metrics dashboard
- [ ] Uptime monitoring (> 99.9%)
- [ ] Alert thresholds configured

### Rollback Triggers
Automatic rollback if:
- [ ] Error rate > 5% for 2 minutes
- [ ] Response time P95 > 3 seconds
- [ ] Health check fails 3 times in row
- [ ] Memory usage > 90%
- [ ] 500 errors > 10 per minute

### Validation Script
```bash
#!/bin/bash
# post-deploy-validate.sh
DEPLOY_URL="https://productory-powerups.netlify.app"

# Health check
curl -f "$DEPLOY_URL/api/health" || exit 1

# Performance test
npx lighthouse "$DEPLOY_URL" --only-categories=performance
SCORE=$(cat lighthouse-report.json | jq '.categories.performance.score')
if (( $(echo "$SCORE < 0.9" | bc -l) )); then
  echo "Performance degraded!"
  netlify deploy --restore  # Rollback
fi

# Smoke tests
BASE_URL=$DEPLOY_URL npm run test:e2e:smoke
```

---

## 🚨 Emergency Fallback Options

### Option A: Standalone Next.js
- Move web-next to separate repo
- Deploy as independent app
- Link via environment variables

### Option B: Alternative Hosting
- Deploy to Vercel (Next.js native)
- Use Railway/Render
- Self-host on VPS

### Option C: Static Export
- Convert to static site (next export)
- Host on GitHub Pages/S3
- Lose SSR functionality

---

## 📊 Diagnostic Commands Checklist

```bash
# Local testing
cd packages/web-next
npm run build
npm run start

# Dependency check
npm ls
npm audit
npm ci --verbose

# Netlify CLI
netlify build
netlify deploy --build
netlify logs:function

# Git state
git clean -fdx
git status
git log --oneline -10
```

---

## 🎯 Success Metrics
1. Build succeeds on Netlify
2. Deployment URL accessible
3. All features working (auth, API, UI)
4. Automatic deployment on git push
5. Build time < 5 minutes

---

## 🔧 Master Validation Script
**Run ALL quality gates in sequence:**

```bash
#!/bin/bash
# master-quality-check.sh
# Run this before ANY deployment attempt

set -e  # Exit on first error
FAILED_GATES=()

echo "🚀 Starting Master Quality Validation..."

# Gate 0: Pre-flight
echo "Gate 0: Pre-flight checks..."
./scripts/preflight-check.sh || FAILED_GATES+=("Gate 0: Pre-flight")

# Gate 1: Strict build
echo "Gate 1: Strict build validation..."
./scripts/strict-build-check.sh || FAILED_GATES+=("Gate 1: Build quality")

# Gate 2: Dependencies
echo "Gate 2: Dependency cleanup..."
./scripts/dependency-cleanup.sh || FAILED_GATES+=("Gate 2: Dependencies")

# Gate 3: Netlify config
echo "Gate 3: Netlify configuration..."
netlify build --dry || FAILED_GATES+=("Gate 3: Netlify config")

# Gate 4: Environment vars
echo "Gate 4: Environment variables..."
./scripts/env-check.sh || FAILED_GATES+=("Gate 4: Env vars")

# Report results
if [ ${#FAILED_GATES[@]} -eq 0 ]; then
  echo "✅ ALL QUALITY GATES PASSED - Ready for deployment!"
  echo "Run: git push origin main"
else
  echo "❌ FAILED GATES:"
  for gate in "${FAILED_GATES[@]}"; do
    echo "  - $gate"
  done
  exit 1
fi
```

## Required NPM Scripts
Add to root `package.json`:

```json
{
  "scripts": {
    // Quality Gates
    "quality": "npm run quality:all",
    "quality:all": "./scripts/master-quality-check.sh",
    "quality:preflight": "./scripts/preflight-check.sh",
    "quality:build": "./scripts/strict-build-check.sh",
    "quality:deps": "./scripts/dependency-cleanup.sh",
    "quality:pre-deploy": "./scripts/pre-deployment-suite.sh",
    "quality:post-deploy": "./scripts/post-deploy-validate.sh",
    
    // Linting & Formatting
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "npm run lint -- --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit --strict",
    
    // Testing
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:smoke": "playwright test tests/e2e/smoke.spec.ts",
    "test:e2e:critical": "playwright test tests/e2e/critical-paths.spec.ts",
    "test:e2e:preview": "playwright test --config=playwright.preview.config.ts",
    "test:integration": "vitest run tests/integration",
    "test:api": "vitest run tests/api",
    "test:accessibility": "playwright test tests/e2e/accessibility.spec.ts",
    "test:performance": "lighthouse http://localhost:3000 --view",
    
    // Auditing & Analysis
    "audit:security": "npm audit --audit-level=high",
    "audit:deps": "npx depcheck",
    "audit:circular": "npx madge --circular packages/*/src",
    "analyze:bundle": "ANALYZE=true npm run build:web",
    "analyze:deps": "npx depcheck && npm outdated",
    "analyze:security": "npm audit && npx trivy fs .",
    
    // Building
    "build:all": "npm run build:shared && npm run build:extension && npm run build:web",
    "build:shared": "cd packages/shared && npm run build",
    "build:extension": "cd packages/extension && npm run build",
    "build:web": "cd packages/web-next && npm run build",
    
    // Cleaning
    "clean": "rm -rf node_modules packages/*/node_modules .next packages/*/.next",
    "clean:cache": "npm cache clean --force",
    
    // Deployment
    "deploy:preview": "netlify deploy --build",
    "deploy:production": "npm run quality:pre-deploy && netlify deploy --build --prod",
    "deploy:rollback": "netlify deploy --restore",
    
    // Monitoring
    "monitor:health": "curl -s https://productory-powerups.netlify.app/api/health | jq",
    "monitor:logs": "netlify logs:function --tail",
    
    // CI/CD
    "ci": "npm ci && npm run quality:all",
    "prepare": "husky install"
  }
}
```

## Next Immediate Steps:
1. **Run Gate 0** - Pre-flight health check
2. **Execute Gate 2** - Clean up all lockfiles
3. **Run Gate 1** - Strict build validation
4. **Test with Netlify CLI** (Gate 8)
5. **Run master validation script** before any deployment