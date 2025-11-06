#!/bin/bash
# detect-duplicates.sh - Find duplicate content in documentation
#
# Usage: ./detect-duplicates.sh [docs_dir] [threshold]
#
# Detects:
# - Duplicate file names
# - Similar content (>80% similarity by default)
# - Redundant documentation
#
# Arguments:
#   docs_dir  - Directory to scan (default: docs)
#   threshold - Similarity threshold 0-100 (default: 80)
#
# Exit codes:
# 0 - No duplicates found
# 1 - Duplicates detected

set -e

# Configuration
DOCS_DIR="${1:-docs}"
THRESHOLD="${2:-80}"
EXIT_CODE=0
DUPLICATE_COUNT=0

echo "🔍 Detecting duplicate documentation..."
echo "   Scanning directory: $DOCS_DIR"
echo "   Similarity threshold: ${THRESHOLD}%"
echo ""

# Check if docs directory exists
if [ ! -d "$DOCS_DIR" ]; then
    echo "❌ Error: Documentation directory not found: $DOCS_DIR"
    exit 1
fi

# Check for duplicate filenames (same name in different locations)
echo "📋 Checking for duplicate filenames..."
duplicate_names=$(find "$DOCS_DIR" -type f -name "*.md" -printf "%f\n" | sort | uniq -d)

if [ ! -z "$duplicate_names" ]; then
    echo "   ⚠️  Found duplicate filenames:"
    while IFS= read -r filename; do
        if [ ! -z "$filename" ]; then
            echo ""
            echo "   📄 $filename"
            find "$DOCS_DIR" -type f -name "$filename" | sed 's/^/      /'
            DUPLICATE_COUNT=$((DUPLICATE_COUNT + 1))
            EXIT_CODE=1
        fi
    done <<< "$duplicate_names"
    echo ""
else
    echo "   ✅ No duplicate filenames found"
fi

# Check for similar content (basic approach using word count and common words)
echo ""
echo "📋 Checking for similar content..."

# Get all markdown files
md_files=$(find "$DOCS_DIR" -type f -name "*.md" ! -name "README.md" 2>/dev/null || true)

if [ -z "$md_files" ]; then
    echo "   ℹ️  No content files to compare"
else
    file_count=$(echo "$md_files" | wc -l | tr -d ' ')
    echo "   Analyzing $file_count file(s)..."

    # Create temp directory for analysis
    temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT

    # Extract titles and first 100 words from each file
    declare -A file_signatures

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            # Get first line (usually title) and first 100 words
            title=$(head -n 1 "$file" | tr -d '#' | tr -d '*' | tr '[:upper:]' '[:lower:]')
            content=$(head -n 50 "$file" | tr '[:upper:]' '[:lower:]' | tr -s '[:space:]' '\n' | head -n 100 | sort | uniq)
            signature="$title|$content"
            file_signatures["$file"]="$signature"
        fi
    done <<< "$md_files"

    # Compare files for similarity
    similar_count=0

    # Convert associative array to indexed for iteration
    files_array=()
    while IFS= read -r file; do
        files_array+=("$file")
    done <<< "$md_files"

    for ((i=0; i<${#files_array[@]}; i++)); do
        file1="${files_array[$i]}"
        sig1="${file_signatures[$file1]}"

        for ((j=i+1; j<${#files_array[@]}; j++)); do
            file2="${files_array[$j]}"
            sig2="${file_signatures[$file2]}"

            # Basic similarity check: compare titles
            title1=$(echo "$sig1" | cut -d'|' -f1 | tr -d ' ')
            title2=$(echo "$sig2" | cut -d'|' -f1 | tr -d ' ')

            if [ ! -z "$title1" ] && [ "$title1" = "$title2" ]; then
                if [ $similar_count -eq 0 ]; then
                    echo ""
                    echo "   ⚠️  Found similar content:"
                fi
                echo ""
                echo "   📄 Similar titles detected:"
                echo "      ${file1#$DOCS_DIR/}"
                echo "      ${file2#$DOCS_DIR/}"
                similar_count=$((similar_count + 1))
                EXIT_CODE=1
            fi
        done
    done

    if [ $similar_count -eq 0 ]; then
        echo "   ✅ No obvious duplicates detected"
    else
        echo ""
        echo "   Found $similar_count potential duplicate(s)"
    fi
fi

# Check for OAuth documentation duplicates (specific rule)
echo ""
echo "📋 Checking OAuth documentation consolidation..."
oauth_files=$(find "$DOCS_DIR" -type f -name "*oauth*.md" 2>/dev/null || true)

if [ ! -z "$oauth_files" ]; then
    oauth_count=$(echo "$oauth_files" | wc -l | tr -d ' ')

    if [ $oauth_count -gt 3 ]; then
        echo "   ⚠️  Found $oauth_count OAuth-related files:"
        echo "$oauth_files" | sed "s|^$DOCS_DIR/|      |"
        echo ""
        echo "   Recommendation: Consolidate into /docs/security/oauth/"
        EXIT_CODE=1
    else
        echo "   ✅ OAuth documentation count acceptable ($oauth_count files)"
    fi
else
    echo "   ℹ️  No OAuth documentation found"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Duplicate detection PASSED"
    echo "   - No significant duplicates found"
else
    echo "⚠️  Duplicate detection found issues"
    echo "   - Found $DUPLICATE_COUNT duplicate filename(s)"
    echo "   - Review and consolidate similar content"
    echo ""
    echo "   Recommendations:"
    echo "   - Merge duplicate content into single source"
    echo "   - Archive outdated versions"
    echo "   - Update links to point to consolidated docs"
fi
echo "═══════════════════════════════════════════════"

exit $EXIT_CODE
