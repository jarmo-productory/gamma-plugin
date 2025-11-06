#!/bin/bash
# validate-structure.sh - Validate sprint documentation structure
#
# Usage: ./validate-structure.sh [docs_dir]
#
# Validates:
# - No flat sprint files (all must be nested)
# - Every sprint has README.md
# - Sprint metadata exists
#
# Exit codes:
# 0 - All checks passed
# 1 - Validation failed

set -e

# Configuration
DOCS_DIR="${1:-docs}"
EXIT_CODE=0

echo "🔍 Validating sprint structure..."
echo "   Checking directory: $DOCS_DIR"
echo ""

# Check if docs directory exists
if [ ! -d "$DOCS_DIR" ]; then
    echo "❌ Error: Documentation directory not found: $DOCS_DIR"
    exit 1
fi

# Check if sprints directory exists
if [ ! -d "$DOCS_DIR/sprints" ]; then
    echo "⚠️  Warning: No sprints directory found"
    echo "   Expected: $DOCS_DIR/sprints/"
    exit 0
fi

# Check for flat sprint files (FORBIDDEN)
echo "📋 Checking for flat sprint files..."
flat_sprints=$(find "$DOCS_DIR/sprints" -maxdepth 1 -type f -name "sprint-*.md" 2>/dev/null || true)
if [ ! -z "$flat_sprints" ]; then
    echo "❌ Found flat sprint files (must be nested directories):"
    echo "$flat_sprints" | sed 's/^/   /'
    echo ""
    echo "   Fix: Run ./scripts/docs/migrate-document.sh for each file"
    EXIT_CODE=1
else
    echo "   ✅ No flat sprint files found"
fi

# Check every sprint directory has README.md
echo ""
echo "📋 Checking sprint README files..."
sprint_count=0
missing_readme=0
missing_metadata=0

for sprint_dir in "$DOCS_DIR/sprints"/sprint-*/; do
    if [ -d "$sprint_dir" ]; then
        sprint_count=$((sprint_count + 1))
        sprint_name=$(basename "$sprint_dir")

        # Check for README.md
        if [ ! -f "$sprint_dir/README.md" ]; then
            echo "   ❌ Missing README.md in: $sprint_name"
            missing_readme=$((missing_readme + 1))
            EXIT_CODE=1
        fi

        # Check for .sprint-metadata.json
        if [ ! -f "$sprint_dir/.sprint-metadata.json" ]; then
            echo "   ⚠️  Missing metadata in: $sprint_name"
            echo "      (Sprint may have been created manually)"
            missing_metadata=$((missing_metadata + 1))
        fi
    fi
done

if [ $sprint_count -eq 0 ]; then
    echo "   ℹ️  No sprint directories found"
elif [ $missing_readme -eq 0 ]; then
    echo "   ✅ All $sprint_count sprints have README.md"
fi

if [ $missing_metadata -gt 0 ]; then
    echo ""
    echo "   ℹ️  $missing_metadata sprint(s) missing metadata (non-critical)"
fi

# Check for docs in /src/ folder (FORBIDDEN)
echo ""
echo "📋 Checking for docs in /src/ folder..."
src_docs=$(find src -type f -name "*.md" 2>/dev/null || true)
if [ ! -z "$src_docs" ]; then
    echo "   ⚠️  Found documentation in /src/ folder:"
    echo "$src_docs" | sed 's/^/      /'
    echo ""
    echo "   Recommendation: Move to /docs/ or /documents/"
else
    echo "   ✅ No documentation in /src/ folder"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Sprint structure validation PASSED"
    echo "   - Checked $sprint_count sprint(s)"
    echo "   - All sprints properly structured"
else
    echo "❌ Sprint structure validation FAILED"
    echo "   - Checked $sprint_count sprint(s)"
    echo "   - Found $missing_readme missing README(s)"
    [ ! -z "$flat_sprints" ] && echo "   - Found flat sprint files"
fi
echo "═══════════════════════════════════════════════"

exit $EXIT_CODE
