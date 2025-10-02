#!/bin/bash

# Script to add CORS support to an API endpoint
# Usage: ./add-cors-to-endpoint.sh <path-to-route.ts>

FILE=$1

if [ ! -f "$FILE" ]; then
  echo "File not found: $FILE"
  exit 1
fi

# Check if already has CORS
if grep -q "withCors\|handleOPTIONS" "$FILE"; then
  echo "✅ $FILE already has CORS"
  exit 0
fi

# Backup file
cp "$FILE" "$FILE.backup"

# Add import if not present
if ! grep -q "from '@/utils/cors'" "$FILE"; then
  # Find the last import line
  LAST_IMPORT=$(grep -n "^import" "$FILE" | tail -1 | cut -d: -f1)
  if [ -n "$LAST_IMPORT" ]; then
    sed -i.tmp "${LAST_IMPORT}a\\
import { withCors, handleOPTIONS } from '@/utils/cors';
" "$FILE"
    rm "$FILE.tmp"
  fi
fi

echo "Added CORS imports to $FILE"
echo "⚠️  You still need to manually:"
echo "   1. Add OPTIONS handler"
echo "   2. Wrap all NextResponse.json() with withCors(..., request)"
