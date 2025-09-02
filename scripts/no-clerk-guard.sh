#!/usr/bin/env bash
set -euo pipefail

echo "🔎 Scanning for Clerk references..."

# Search patterns (code + SQL + configs)
if grep -R "@clerk\|CLERK_\|ClerkProvider\|withClerk\|clerk_id\|auth.third_party.clerk" \
  --exclude-dir=node_modules --exclude-dir=.git --line-number .; then
  echo "❌ ERROR: Clerk references detected. Please remove before merging."
  exit 1
fi

echo "🔎 Scanning docs for 'Clerk' mentions (excluding archives)..."
docs_hits=$(rg -n "\\bClerk\\b" documents | rg -v "/archive/") || true
if [[ -n "$docs_hits" ]]; then
  echo "❌ ERROR: 'Clerk' found in non-archive docs. Please remove or move to archive:"
  echo "$docs_hits"
  exit 1
fi

echo "✅ No Clerk traces found in code or non-archive docs."

