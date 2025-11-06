#!/bin/bash
# validate-readmes.sh - Validate README section completeness
#
# Usage: ./validate-readmes.sh [docs_dir]
#
# Validates:
# - Required sections present in sprint READMEs
# - Section headers properly formatted
# - No placeholder text
#
# Exit codes:
# 0 - All checks passed
# 1 - Validation failed

set -e

# Configuration
DOCS_DIR="${1:-docs}"
EXIT_CODE=0

# Required sections for sprint READMEs
REQUIRED_SECTIONS=(
    "Quick Start"
    "Document Organization"
    "Related"
    "Status"
    "Success Criteria"
)

echo "🔍 Validating README sections..."
echo "   Checking directory: $DOCS_DIR"
echo ""

# Check if sprints directory exists
if [ ! -d "$DOCS_DIR/sprints" ]; then
    echo "⚠️  Warning: No sprints directory found"
    exit 0
fi

readme_count=0
failed_count=0

for readme in "$DOCS_DIR/sprints"/sprint-*/README.md; do
    if [ -f "$readme" ]; then
        readme_count=$((readme_count + 1))
        readme_name=$(dirname "$readme" | xargs basename)

        echo "📄 Checking: $readme_name/README.md"

        section_failures=0

        # Check for required sections
        for section in "${REQUIRED_SECTIONS[@]}"; do
            # Match section headers with emoji or without
            if ! grep -q -E "^##+ .*$section" "$readme"; then
                echo "   ❌ Missing section: $section"
                section_failures=$((section_failures + 1))
                EXIT_CODE=1
            fi
        done

        # Check for placeholder text
        if grep -q -i "TODO:\|TBD\|FIXME:\|XXX:" "$readme"; then
            echo "   ⚠️  Contains placeholder text (TODO, TBD, FIXME, XXX)"
        fi

        # Check for broken markdown links
        broken_links=$(grep -o '\[.*\]([^)]*)' "$readme" | grep -E '\]\(.*\)' | grep -v 'http' | while read link; do
            # Extract the file path from markdown link
            file_path=$(echo "$link" | sed -E 's/.*\(([^)]*)\).*/\1/' | sed 's/#.*//')
            if [ ! -z "$file_path" ] && [[ "$file_path" != http* ]] && [[ "$file_path" != "#"* ]]; then
                # Convert relative path to absolute
                link_dir=$(dirname "$readme")
                full_path="$link_dir/$file_path"
                if [ ! -f "$full_path" ] && [ ! -d "$full_path" ]; then
                    echo "$file_path"
                fi
            fi
        done)

        if [ ! -z "$broken_links" ]; then
            echo "   ⚠️  Potentially broken links found:"
            echo "$broken_links" | sed 's/^/      /'
        fi

        if [ $section_failures -eq 0 ]; then
            echo "   ✅ All required sections present"
        else
            failed_count=$((failed_count + 1))
        fi

        echo ""
    fi
done

# Summary
echo "═══════════════════════════════════════════════"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ README validation PASSED"
    echo "   - Checked $readme_count README(s)"
    echo "   - All required sections present"
else
    echo "❌ README validation FAILED"
    echo "   - Checked $readme_count README(s)"
    echo "   - $failed_count README(s) missing required sections"
    echo ""
    echo "   Required sections:"
    for section in "${REQUIRED_SECTIONS[@]}"; do
        echo "     - $section"
    done
fi
echo "═══════════════════════════════════════════════"

exit $EXIT_CODE
