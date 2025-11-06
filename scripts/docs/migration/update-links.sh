#!/bin/bash
# Link Updater for /documents → /docs migration
# Updates all internal markdown links after migration

set -euo pipefail

PROJECT_ROOT="/Users/jarmotuisk/Projects/gamma-plugin"
DRY_RUN=false
VERBOSE=false
LOG_FILE="$PROJECT_ROOT/scripts/docs/migration/link-update.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Update internal markdown links after /documents → /docs migration

OPTIONS:
    -d, --dry-run       Show what would be changed without making changes
    -v, --verbose       Show detailed output
    -h, --help          Show this help message

EXAMPLES:
    # Dry run to see what would change
    $0 --dry-run

    # Actually update all links
    $0

    # Verbose mode with dry run
    $0 --dry-run --verbose
EOF
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            error "Unknown option: $1"
            usage
            ;;
    esac
done

# Initialize log
> "$LOG_FILE"
log "Link updater started"
if [ "$DRY_RUN" = true ]; then
    warning "DRY RUN MODE - No changes will be made"
fi

# Function to convert filename to kebab-case
to_kebab_case() {
    local filename="$1"
    echo "$filename" | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' | tr '[:upper:]' '[:lower:]' | tr '_' '-'
}

# Function to find the new location of a migrated file
find_new_location() {
    local old_path="$1"
    local basename=$(basename "$old_path")
    local kebab_name=$(to_kebab_case "$basename")

    # Search in docs directory for the kebab-case version
    local new_path=$(find "$PROJECT_ROOT/docs" -type f -name "$kebab_name" 2>/dev/null | head -1)

    if [ -n "$new_path" ]; then
        echo "$new_path"
        return 0
    fi

    # Try with original filename if kebab-case not found
    new_path=$(find "$PROJECT_ROOT/docs" -type f -name "$basename" 2>/dev/null | head -1)
    if [ -n "$new_path" ]; then
        echo "$new_path"
        return 0
    fi

    return 1
}

# Function to calculate relative path
get_relative_path() {
    local from="$1"
    local to="$2"
    python3 -c "import os.path; print(os.path.relpath('$to', os.path.dirname('$from')))"
}

# Function to update links in a file
update_links_in_file() {
    local file="$1"
    local changes=0
    local temp_file="${file}.tmp"

    [ "$VERBOSE" = true ] && log "Processing: $file"

    # Read file line by line
    while IFS= read -r line; do
        local updated_line="$line"

        # Find all markdown links: [text](path)
        while [[ "$updated_line" =~ \[([^\]]*)\]\(([^)]+)\) ]]; do
            local link_text="${BASH_REMATCH[1]}"
            local link_path="${BASH_REMATCH[2]}"
            local original_link="[$link_text]($link_path)"

            # Skip external links and anchors
            if [[ "$link_path" =~ ^https?:// ]] || [[ "$link_path" =~ ^# ]]; then
                break
            fi

            # Check if link points to /documents
            if [[ "$link_path" =~ documents/ ]]; then
                # Resolve the absolute path of the linked file
                local file_dir=$(dirname "$file")
                local linked_file=$(cd "$file_dir" && realpath "$link_path" 2>/dev/null || echo "$link_path")

                if [ -f "$linked_file" ]; then
                    # File exists, check if it has been migrated
                    if [[ "$linked_file" =~ /documents/ ]]; then
                        # Find new location in /docs
                        local new_location=$(find_new_location "$linked_file")

                        if [ -n "$new_location" ]; then
                            # Calculate new relative path
                            local new_relative_path=$(get_relative_path "$file" "$new_location")
                            local new_link="[$link_text]($new_relative_path)"

                            updated_line="${updated_line/$original_link/$new_link}"
                            changes=$((changes + 1))

                            if [ "$VERBOSE" = true ]; then
                                log "  Found: $original_link"
                                log "  Updated: $new_link"
                            fi
                        else
                            warning "  Could not find new location for: $link_path"
                        fi
                    fi
                else
                    # Check if link might be relative and resolve differently
                    if [[ "$link_path" =~ ^\.\./ ]] || [[ "$link_path" =~ ^\./ ]]; then
                        local resolved_path="$file_dir/$link_path"
                        if [ -f "$resolved_path" ]; then
                            local new_location=$(find_new_location "$resolved_path")
                            if [ -n "$new_location" ]; then
                                local new_relative_path=$(get_relative_path "$file" "$new_location")
                                local new_link="[$link_text]($new_relative_path)"
                                updated_line="${updated_line/$original_link/$new_link}"
                                changes=$((changes + 1))
                            fi
                        fi
                    fi
                fi
            fi

            # Move past this link to find next one
            updated_line="${updated_line/$original_link/LINK_PROCESSED}"
        done

        # Restore processed links
        updated_line="${updated_line//LINK_PROCESSED/$original_link}"
        echo "$updated_line" >> "$temp_file"
    done < "$file"

    if [ $changes -gt 0 ]; then
        success "  Updated $changes link(s) in $file"

        if [ "$DRY_RUN" = false ]; then
            mv "$temp_file" "$file"
        else
            rm "$temp_file"
        fi
    else
        [ -f "$temp_file" ] && rm "$temp_file"
    fi

    return $changes
}

# Main execution
main() {
    log "Scanning for markdown files with links to update..."

    local total_files=0
    local total_changes=0

    # Find all markdown files in the project (excluding node_modules, .git, etc.)
    while IFS= read -r file; do
        total_files=$((total_files + 1))
        if update_links_in_file "$file"; then
            total_changes=$((total_changes + $?))
        fi
    done < <(find "$PROJECT_ROOT" -type f -name "*.md" \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/dist/*" \
        -not -path "*/build/*")

    log ""
    log "===== Summary ====="
    log "Files processed: $total_files"
    log "Links updated: $total_changes"

    if [ "$DRY_RUN" = true ]; then
        warning "DRY RUN COMPLETE - No changes were made"
        warning "Run without --dry-run to apply changes"
    else
        success "Link update complete!"
        success "Review changes with: git diff"
    fi

    log "Full log: $LOG_FILE"
}

# Validate prerequisites
if ! command -v python3 &> /dev/null; then
    error "python3 is required but not installed"
    exit 1
fi

# Run main
main
