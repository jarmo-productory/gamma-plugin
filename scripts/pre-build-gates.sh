#!/bin/bash

# Pre-build gates script for Gamma Timetable Extension
# This script runs basic quality checks before builds

set -e

echo "🚪 Running pre-build gates..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this from the project root."
    exit 1
fi

# Basic file structure check
if [ ! -d "packages" ]; then
    echo "❌ Error: packages directory not found"
    exit 1
fi

echo "✅ Pre-build gates passed"

# Sprint 23: Internal APIs guardrails
# 1) No service-role usage outside /api/admin in web API routes
VIOLATIONS=$(rg -n "createServiceRoleClient\(" packages/web/src/app/api | rg -v "/api/admin/") || true
if [ -n "$VIOLATIONS" ]; then
  echo "❌ Service-role client used outside /api/admin/* in API routes:" >&2
  echo "$VIOLATIONS" >&2
  exit 1
fi

# 2) Internal/admin routes must import internal-guard
MISSING_GUARD=$(rg -l "^export async function (GET|POST|PUT|PATCH|DELETE)" packages/web/src/app/api/_internal packages/web/src/app/api/admin | while read -r f; do 
  if ! rg -q "internal-guard" "$f"; then echo "$f"; fi; 
done) || true
if [ -n "$MISSING_GUARD" ]; then
  echo "❌ Internal/Admin routes missing guard import:" >&2
  echo "$MISSING_GUARD" >&2
  exit 1
fi

# 3) Fail build if legacy debug/test/migrate paths still exist in web API (should be moved)
LEGACY=$(rg -l "^" packages/web/src/app/api/debug packages/web/src/app/api/migrate 2>/dev/null || true)
if [ -n "$LEGACY" ]; then
  echo "❌ Legacy debug/test/migrate API routes present (must be removed/migrated):" >&2
  echo "$LEGACY" >&2
  exit 1
fi

echo "✅ Sprint 23 guardrails passed"
