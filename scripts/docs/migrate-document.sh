#!/bin/bash
# migrate-document.sh - Move document and update all internal links
#
# Usage: ./migrate-document.sh <source_file> <target_dir>
#
# Performs:
# - Move file to new location
# - Update all internal links pointing to the file
# - Update links within the moved file
# - Create README if target is sprint folder
#
# Exit codes:
# 0 - Migration successful
# 1 - Migration failed

set -e

# Configuration
SOURCE_FILE="$1"
TARGET_DIR="$2"
EXIT_CODE=0

# Show usage if arguments missing
if [ -z "$SOURCE_FILE" ] || [ -z "$TARGET_DIR" ]; then
    echo "Usage: ./migrate-document.sh <source_file> <target_dir>"
    echo ""
    echo "Example:"
    echo "  ./migrate-document.sh docs/sprints/sprint-01.md docs/sprints/sprint-01/"
    echo ""
    exit 1
fi

echo "📦 Migrating documentation..."
echo "   Source: $SOURCE_FILE"
echo "   Target: $TARGET_DIR"
echo ""

# Validate source file exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Error: Source file not found: $SOURCE_FILE"
    exit 1
fi

# Create target directory if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
    echo "📁 Creating target directory..."
    mkdir -p "$TARGET_DIR"
fi

# Get filenames
source_filename=$(basename "$SOURCE_FILE")
source_dir=$(dirname "$SOURCE_FILE")

# Determine new filename (remove sprint-XX- prefix if inside sprint folder)
target_basename="$source_filename"
if [[ "$TARGET_DIR" =~ sprint-[0-9]+ ]] && [[ "$source_filename" =~ ^sprint-[0-9]+-(.+)$ ]]; then
    target_basename="${BASH_REMATCH[1]}"
    echo "📝 Removing sprint prefix from filename"
    echo "   New name: $target_basename"
fi

target_file="$TARGET_DIR/$target_basename"

# Check if target already exists
if [ -f "$target_file" ] && [ "$SOURCE_FILE" != "$target_file" ]; then
    echo "⚠️  Warning: Target file already exists: $target_file"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Migration cancelled"
        exit 1
    fi
fi

# Calculate relative paths for link updates
echo ""
echo "🔗 Calculating paths for link updates..."

# Find all markdown files that might link to this document
docs_root="docs"
if [ -d "documents" ]; then
    docs_root="documents"
fi

md_files=$(find "$docs_root" -type f -name "*.md" 2>/dev/null || true)

# Get relative paths
old_path_from_root="${SOURCE_FILE#$docs_root/}"
new_path_from_root="${target_file#$docs_root/}"

echo "   Old path: $old_path_from_root"
echo "   New path: $new_path_from_root"

# Update links in all markdown files
echo ""
echo "🔄 Updating internal links..."
updated_count=0

while IFS= read -r md_file; do
    if [ ! -z "$md_file" ] && [ -f "$md_file" ]; then
        # Check if file contains links to the source file
        if grep -q "]($old_path_from_root)" "$md_file" 2>/dev/null || \
           grep -q "](./$source_filename)" "$md_file" 2>/dev/null || \
           grep -q "]($source_filename)" "$md_file" 2>/dev/null; then

            # Calculate relative path from this file to the new location
            md_dir=$(dirname "$md_file")

            # Update the links
            sed -i.bak "s|]($old_path_from_root)|]($new_path_from_root)|g" "$md_file"
            sed -i.bak "s|](./$source_filename)|]($new_path_from_root)|g" "$md_file"
            sed -i.bak "s|]($source_filename)|]($new_path_from_root)|g" "$md_file"

            rm -f "$md_file.bak"

            echo "   ✅ Updated: ${md_file#$docs_root/}"
            updated_count=$((updated_count + 1))
        fi
    fi
done <<< "$md_files"

if [ $updated_count -eq 0 ]; then
    echo "   ℹ️  No links needed updating"
fi

# Update links within the moved file itself
echo ""
echo "🔄 Updating links within the document..."

if [ -f "$SOURCE_FILE" ]; then
    # Calculate how many directories up we need to go
    source_depth=$(echo "$source_dir" | tr -cd '/' | wc -c)
    target_depth=$(echo "$TARGET_DIR" | tr -cd '/' | wc -c)
    depth_diff=$((target_depth - source_depth))

    if [ $depth_diff -gt 0 ]; then
        # Need to add ../ prefixes
        prefix=""
        for ((i=0; i<depth_diff; i++)); do
            prefix="../$prefix"
        done

        echo "   Adding $depth_diff level(s) of ../ to relative links"

        # Update relative links (not starting with / or http)
        sed -i.bak "s|](\.\/|](${prefix}|g" "$SOURCE_FILE"
        rm -f "$SOURCE_FILE.bak"
    elif [ $depth_diff -lt 0 ]; then
        # Need to remove ../ prefixes
        remove_count=$((- depth_diff))
        echo "   Removing $remove_count level(s) of ../ from relative links"

        for ((i=0; i<remove_count; i++)); do
            sed -i.bak "s|\.\./||g" "$SOURCE_FILE"
            rm -f "$SOURCE_FILE.bak"
        done
    fi
fi

# Move the file
echo ""
echo "📦 Moving file..."
if mv "$SOURCE_FILE" "$target_file"; then
    echo "   ✅ File moved successfully"
else
    echo "   ❌ Failed to move file"
    exit 1
fi

# Check if target is a sprint directory and needs README
if [[ "$TARGET_DIR" =~ sprint-[0-9]+$ ]]; then
    readme_path="$TARGET_DIR/README.md"
    if [ ! -f "$readme_path" ]; then
        echo ""
        echo "📝 Sprint directory detected, generating README..."

        # Call generate-readme.sh if it exists
        script_dir=$(dirname "$0")
        if [ -f "$script_dir/generate-readme.sh" ]; then
            bash "$script_dir/generate-readme.sh" "$TARGET_DIR"
        else
            echo "   ⚠️  generate-readme.sh not found"
            echo "   Please create README.md manually"
        fi
    fi
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════"
echo "✅ Migration COMPLETE"
echo "   - File moved: $target_basename"
echo "   - Links updated: $updated_count file(s)"
echo "   - New location: $target_file"
echo ""
echo "📝 Next steps:"
echo "   1. Review the moved document"
echo "   2. Test all links work correctly"
echo "   3. Commit changes with:"
echo "      git add $TARGET_DIR"
echo "      git add $docs_root"
echo "      git commit -m 'docs: migrate $source_filename to ${TARGET_DIR#docs/}'"
echo "═══════════════════════════════════════════════"

exit $EXIT_CODE
