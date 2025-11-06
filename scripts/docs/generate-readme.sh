#!/bin/bash
# generate-readme.sh - Auto-generate README templates for documentation folders
#
# Usage: ./generate-readme.sh [target_dir] [--force]
#
# Generates:
# - README.md with standard template
# - Required sections pre-filled
# - Document organization table
#
# Options:
#   --force  Overwrite existing README.md
#
# Exit codes:
# 0 - README generated successfully
# 1 - Generation failed or README already exists

set -e

# Configuration
TARGET_DIR="${1:-.}"
FORCE=false
EXIT_CODE=0

# Check for --force flag
if [ "$2" = "--force" ] || [ "$1" = "--force" ]; then
    FORCE=true
    if [ "$1" = "--force" ]; then
        TARGET_DIR="."
    fi
fi

echo "📝 Generating README template..."
echo "   Target directory: $TARGET_DIR"
if [ "$FORCE" = true ]; then
    echo "   Mode: FORCE (will overwrite existing)"
fi
echo ""

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Error: Directory not found: $TARGET_DIR"
    exit 1
fi

readme_path="$TARGET_DIR/README.md"

# Check if README already exists
if [ -f "$readme_path" ] && [ "$FORCE" = false ]; then
    echo "ℹ️  README.md already exists"
    echo "   Use --force to overwrite"
    exit 1
fi

# Detect context (sprint vs general folder)
dir_name=$(basename "$TARGET_DIR")
is_sprint=false
sprint_number=""

if [[ "$dir_name" =~ ^sprint-([0-9]+)$ ]]; then
    is_sprint=true
    sprint_number="${BASH_REMATCH[1]}"
fi

# Get list of markdown files in directory
md_files=$(find "$TARGET_DIR" -maxdepth 1 -type f -name "*.md" ! -name "README.md" 2>/dev/null || true)
file_count=$(echo "$md_files" | grep -c "." || echo "0")

# Get current date
current_date=$(date +%Y-%m-%d)

# Generate README content based on context
if [ "$is_sprint" = true ]; then
    # Sprint README template
    cat > "$readme_path" << 'SPRINT_EOF'
# Sprint [NUMBER]: [SPRINT_NAME]

**Status:** 📋 PLANNING
**Start Date:** [START_DATE]
**Estimated Duration:** TBD

---

## 🎯 Quick Start (for AI agents)

**If you're implementing this sprint, read in this order:**

1. **[name]-plan.md** - Goals, deliverables, acceptance criteria

---

## 📚 Document Organization

| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
[DOC_TABLE_ROWS]

---

## 🔗 Related Sprints

**Prerequisites:**
- [List prerequisite sprints]

**Future Dependencies:**
- [List future sprints that depend on this]

---

## 📊 Sprint Status

- **Current Phase:** Planning
- **Completion:** 0% (0/0 tasks)
- **Key Milestones:**
  - [ ] Planning complete
  - [ ] Implementation complete
  - [ ] Testing complete

---

## 🎯 Success Criteria

**This sprint is COMPLETE when:**
- [ ] [Define specific success criteria]
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code reviewed and merged

---

**Created:** [CREATE_DATE]
**Created by:** Documentation automation script
**Template version:** 1.0.0
SPRINT_EOF

    # Replace placeholders
    sed -i.bak "s/\[NUMBER\]/$sprint_number/g" "$readme_path"
    sed -i.bak "s/\[START_DATE\]/$current_date/g" "$readme_path"
    sed -i.bak "s/\[CREATE_DATE\]/$current_date/g" "$readme_path"

    # Generate document table rows
    if [ $file_count -gt 0 ]; then
        doc_rows=""
        while IFS= read -r file; do
            if [ ! -z "$file" ]; then
                filename=$(basename "$file")
                # Estimate purpose from filename
                purpose="Documentation"
                if [[ "$filename" == *"plan"* ]]; then
                    purpose="Sprint planning document"
                elif [[ "$filename" == *"implementation"* ]]; then
                    purpose="Implementation details"
                elif [[ "$filename" == *"architecture"* ]]; then
                    purpose="Architecture design"
                fi
                doc_rows="$doc_rows| [$filename](./$filename) | $purpose | 📝 Draft | $current_date |\n"
            fi
        done <<< "$md_files"

        # Replace placeholder with actual rows
        printf "%b" "$doc_rows" > /tmp/doc_rows.txt
        sed -i.bak "/\[DOC_TABLE_ROWS\]/r /tmp/doc_rows.txt" "$readme_path"
        sed -i.bak "/\[DOC_TABLE_ROWS\]/d" "$readme_path"
        rm /tmp/doc_rows.txt
    else
        sed -i.bak "s/\[DOC_TABLE_ROWS\]/| [name]-plan.md | Sprint plan | 📝 Draft | $current_date |/g" "$readme_path"
    fi

    rm -f "$readme_path.bak"

    echo "✅ Sprint README generated"
    echo "   Sprint number: $sprint_number"
    echo "   Documents found: $file_count"

else
    # General folder README template
    cat > "$readme_path" << 'GENERAL_EOF'
# [FOLDER_NAME]

**Status:** 📋 Active
**Last Updated:** [UPDATE_DATE]

---

## 🎯 Quick Start

**Purpose:** [Describe the purpose of this folder]

**Key Documents:**

[DOC_LIST]

---

## 📚 Document Organization

| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
[DOC_TABLE_ROWS]

---

## 🔗 Related Documentation

**See also:**
- [Link to related documentation]

---

**Created:** [CREATE_DATE]
**Created by:** Documentation automation script
GENERAL_EOF

    # Replace placeholders
    folder_name=$(basename "$TARGET_DIR")
    sed -i.bak "s/\[FOLDER_NAME\]/$folder_name/g" "$readme_path"
    sed -i.bak "s/\[UPDATE_DATE\]/$current_date/g" "$readme_path"
    sed -i.bak "s/\[CREATE_DATE\]/$current_date/g" "$readme_path"

    # Generate document list and table
    if [ $file_count -gt 0 ]; then
        doc_list=""
        doc_rows=""
        counter=1

        while IFS= read -r file; do
            if [ ! -z "$file" ]; then
                filename=$(basename "$file")
                doc_list="$doc_list$counter. **[$filename](./$filename)** - [Description]\n"
                doc_rows="$doc_rows| [$filename](./$filename) | Documentation | 📝 Active | $current_date |\n"
                counter=$((counter + 1))
            fi
        done <<< "$md_files"

        # Replace placeholders
        printf "%b" "$doc_list" > /tmp/doc_list.txt
        sed -i.bak "/\[DOC_LIST\]/r /tmp/doc_list.txt" "$readme_path"
        sed -i.bak "/\[DOC_LIST\]/d" "$readme_path"
        rm /tmp/doc_list.txt

        printf "%b" "$doc_rows" > /tmp/doc_rows.txt
        sed -i.bak "/\[DOC_TABLE_ROWS\]/r /tmp/doc_rows.txt" "$readme_path"
        sed -i.bak "/\[DOC_TABLE_ROWS\]/d" "$readme_path"
        rm /tmp/doc_rows.txt
    else
        sed -i.bak "s/\[DOC_LIST\]/1. **[document.md]** - [Description]/g" "$readme_path"
        sed -i.bak "s/\[DOC_TABLE_ROWS\]/| [document.md] | Documentation | 📝 Active | $current_date |/g" "$readme_path"
    fi

    rm -f "$readme_path.bak"

    echo "✅ General README generated"
    echo "   Folder: $folder_name"
    echo "   Documents found: $file_count"
fi

echo "   Location: $readme_path"
echo ""
echo "📝 Next steps:"
echo "   1. Review and customize the generated README"
echo "   2. Fill in [SPRINT_NAME] or [Description] placeholders"
echo "   3. Add relevant links and context"

exit $EXIT_CODE
