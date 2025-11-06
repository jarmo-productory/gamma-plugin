#!/bin/bash
# fix-naming.sh - Rename files to follow kebab-case convention
#
# Usage: ./fix-naming.sh [docs_dir] [--dry-run]
#
# Fixes:
# - CamelCase to kebab-case
# - snake_case to kebab-case
# - UPPERCASE to lowercase
# - Removes special characters
#
# Options:
#   --dry-run  Show what would be renamed without making changes
#
# Exit codes:
# 0 - All files properly named or renamed
# 1 - Naming violations found (dry-run) or rename failed

set -e

# Configuration
DOCS_DIR="${1:-docs}"
DRY_RUN=false
EXIT_CODE=0
RENAME_COUNT=0

# Check for --dry-run flag
if [ "$2" = "--dry-run" ] || [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    if [ "$1" = "--dry-run" ]; then
        DOCS_DIR="docs"
    fi
fi

echo "🔍 Checking documentation file naming..."
echo "   Scanning directory: $DOCS_DIR"
if [ "$DRY_RUN" = true ]; then
    echo "   Mode: DRY RUN (no changes will be made)"
fi
echo ""

# Check if docs directory exists
if [ ! -d "$DOCS_DIR" ]; then
    echo "❌ Error: Documentation directory not found: $DOCS_DIR"
    exit 1
fi

# Function to convert to kebab-case
to_kebab_case() {
    local filename="$1"
    local basename="${filename%.*}"
    local extension="${filename##*.}"

    # Convert to lowercase
    basename=$(echo "$basename" | tr '[:upper:]' '[:lower:]')

    # Replace underscores with hyphens
    basename=$(echo "$basename" | tr '_' '-')

    # Insert hyphens before capital letters (for remaining CamelCase)
    basename=$(echo "$basename" | sed 's/\([A-Z]\)/-\1/g' | tr '[:upper:]' '[:lower:]')

    # Remove special characters except hyphens and numbers
    basename=$(echo "$basename" | sed 's/[^a-z0-9-]/-/g')

    # Replace multiple consecutive hyphens with single hyphen
    basename=$(echo "$basename" | sed 's/-\+/-/g')

    # Remove leading/trailing hyphens
    basename=$(echo "$basename" | sed 's/^-//; s/-$//')

    echo "${basename}.${extension}"
}

# Find all markdown files
md_files=$(find "$DOCS_DIR" -type f -name "*.md" 2>/dev/null || true)

if [ -z "$md_files" ]; then
    echo "ℹ️  No markdown files found"
    exit 0
fi

file_count=$(echo "$md_files" | wc -l | tr -d ' ')
echo "📊 Found $file_count markdown files"
echo ""

# Check each file for naming violations
while IFS= read -r filepath; do
    if [ -z "$filepath" ]; then
        continue
    fi

    filename=$(basename "$filepath")
    dirname=$(dirname "$filepath")

    # Skip README.md (exception to the rule)
    if [ "$filename" = "README.md" ]; then
        continue
    fi

    # Check if filename follows kebab-case pattern
    if ! echo "$filename" | grep -qE '^[a-z0-9-]+\.md$'; then
        new_filename=$(to_kebab_case "$filename")
        new_filepath="$dirname/$new_filename"

        # Check if target already exists
        if [ -f "$new_filepath" ] && [ "$filepath" != "$new_filepath" ]; then
            echo "⚠️  Cannot rename (target exists):"
            echo "   From: ${filepath#$DOCS_DIR/}"
            echo "   To:   ${new_filepath#$DOCS_DIR/}"
            echo ""
            EXIT_CODE=1
            continue
        fi

        if [ "$DRY_RUN" = true ]; then
            echo "📝 Would rename:"
            echo "   From: ${filepath#$DOCS_DIR/}"
            echo "   To:   ${new_filepath#$DOCS_DIR/}"
            echo ""
            RENAME_COUNT=$((RENAME_COUNT + 1))
            EXIT_CODE=1
        else
            echo "📝 Renaming:"
            echo "   From: ${filepath#$DOCS_DIR/}"
            echo "   To:   ${new_filepath#$DOCS_DIR/}"

            # Attempt to rename
            if mv "$filepath" "$new_filepath" 2>/dev/null; then
                echo "   ✅ Renamed successfully"

                # Update internal links in all markdown files
                echo "   🔗 Updating internal links..."
                old_relative="${filepath#$DOCS_DIR/}"
                new_relative="${new_filepath#$DOCS_DIR/}"

                # Find and update links in all markdown files
                find "$DOCS_DIR" -type f -name "*.md" -exec sed -i.bak "s|]($old_relative)|]($new_relative)|g" {} \;
                find "$DOCS_DIR" -type f -name "*.md.bak" -delete

                echo ""
                RENAME_COUNT=$((RENAME_COUNT + 1))
            else
                echo "   ❌ Rename failed"
                echo ""
                EXIT_CODE=1
            fi
        fi
    fi
done <<< "$md_files"

# Summary
echo "═══════════════════════════════════════════════"
if [ $RENAME_COUNT -eq 0 ]; then
    echo "✅ File naming validation PASSED"
    echo "   - Checked $file_count file(s)"
    echo "   - All files follow kebab-case convention"
elif [ "$DRY_RUN" = true ]; then
    echo "📋 File naming violations found (DRY RUN)"
    echo "   - Checked $file_count file(s)"
    echo "   - Found $RENAME_COUNT file(s) to rename"
    echo ""
    echo "   Run without --dry-run to apply changes"
else
    echo "✅ File naming fixes APPLIED"
    echo "   - Checked $file_count file(s)"
    echo "   - Renamed $RENAME_COUNT file(s)"
    echo "   - Updated internal links"
fi
echo "═══════════════════════════════════════════════"

exit $EXIT_CODE
