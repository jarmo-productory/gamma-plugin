#!/bin/bash
# check-links.sh - Detect broken internal links in documentation
#
# Usage: ./check-links.sh [docs_dir]
#
# Checks:
# - Internal markdown links point to existing files
# - Relative paths resolve correctly
# - Anchor links exist in target files
#
# Exit codes:
# 0 - All links valid
# 1 - Broken links found

set -e

# Configuration
DOCS_DIR="${1:-docs}"
EXIT_CODE=0
BROKEN_COUNT=0

echo "🔍 Checking documentation links..."
echo "   Scanning directory: $DOCS_DIR"
echo ""

# Check if docs directory exists
if [ ! -d "$DOCS_DIR" ]; then
    echo "❌ Error: Documentation directory not found: $DOCS_DIR"
    exit 1
fi

# Find all markdown files
md_files=$(find "$DOCS_DIR" -type f -name "*.md" 2>/dev/null || true)

if [ -z "$md_files" ]; then
    echo "ℹ️  No markdown files found"
    exit 0
fi

file_count=$(echo "$md_files" | wc -l | tr -d ' ')
echo "📊 Found $file_count markdown files to check"
echo ""

# Check each markdown file for links
while IFS= read -r md_file; do
    relative_path="${md_file#$DOCS_DIR/}"

    # Extract all markdown links [text](path)
    links=$(grep -o '\[.*\]([^)]*)' "$md_file" 2>/dev/null || true)

    if [ -z "$links" ]; then
        continue
    fi

    file_has_broken=false

    while IFS= read -r link; do
        if [ -z "$link" ]; then
            continue
        fi

        # Extract the URL/path from the link
        url=$(echo "$link" | sed -E 's/.*\(([^)]*)\).*/\1/')

        # Skip external links and anchors-only
        if [[ "$url" == http* ]] || [[ "$url" == "#"* ]]; then
            continue
        fi

        # Split path and anchor
        path="${url%%#*}"
        anchor="${url#*#}"

        if [ -z "$path" ]; then
            continue
        fi

        # Convert relative path to absolute
        link_dir=$(dirname "$md_file")

        # Handle ../ paths
        if [[ "$path" == ../* ]]; then
            full_path="$link_dir/$path"
        elif [[ "$path" == /* ]]; then
            # Absolute path from repo root
            full_path="${path:1}"
        else
            # Relative to current file
            full_path="$link_dir/$path"
        fi

        # Normalize path (remove ./ and resolve ../)
        full_path=$(cd "$link_dir" && realpath -m "$path" 2>/dev/null || echo "$full_path")

        # Check if target exists
        if [ ! -f "$full_path" ] && [ ! -d "$full_path" ]; then
            if [ "$file_has_broken" = false ]; then
                echo "📄 $relative_path:"
                file_has_broken=true
            fi
            echo "   ❌ Broken link: $url"
            echo "      Target not found: $full_path"
            BROKEN_COUNT=$((BROKEN_COUNT + 1))
            EXIT_CODE=1
        elif [ ! -z "$anchor" ] && [ "$anchor" != "$url" ] && [ -f "$full_path" ]; then
            # Check if anchor exists in target file
            anchor_header=$(echo "$anchor" | tr '[:upper:]' '[:lower:]' | sed 's/-/ /g')
            if ! grep -qi "$anchor_header" "$full_path"; then
                if [ "$file_has_broken" = false ]; then
                    echo "📄 $relative_path:"
                    file_has_broken=true
                fi
                echo "   ⚠️  Anchor not found: $url"
                echo "      Target file exists but anchor missing: #$anchor"
            fi
        fi
    done <<< "$links"

    if [ "$file_has_broken" = true ]; then
        echo ""
    fi
done <<< "$md_files"

# Summary
echo "═══════════════════════════════════════════════"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Link validation PASSED"
    echo "   - Checked $file_count file(s)"
    echo "   - All internal links valid"
else
    echo "❌ Link validation FAILED"
    echo "   - Checked $file_count file(s)"
    echo "   - Found $BROKEN_COUNT broken link(s)"
    echo ""
    echo "   Fix broken links before committing"
fi
echo "═══════════════════════════════════════════════"

exit $EXIT_CODE
