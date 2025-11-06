# Documentation Automation Scripts

**Last Updated:** 2025-10-19
**Status:** 🚧 In Development

---

## 🎯 Purpose

This directory contains automation scripts for maintaining documentation quality and enforcing governance rules.

**See:** [Documentation Governance](/docs/quality/DOCUMENTATION-GOVERNANCE.md) for full rules.

---

## 📋 Available Scripts

### Sprint Management

```bash
# Create new sprint (REQUIRED - no manual creation)
./create-sprint.sh <number> "<name>"

# Example:
./create-sprint.sh 40 "Performance Optimization"
```

### Validation Scripts

```bash
# Validate overall documentation structure
./validate-structure.sh

# Check README completeness in all nested folders
./validate-readmes.sh

# Find and report broken internal links
./check-links.sh

# Detect duplicate content across documentation
./detect-duplicates.sh
```

### Maintenance Scripts

```bash
# Fix file naming violations (CamelCase → kebab-case)
./fix-naming.sh

# Update "Last Modified" dates in README files
./update-readme-dates.sh

# Archive stale documentation (>90 days old)
./archive-stale-docs.sh

# Generate documentation metrics report
./generate-metrics.sh
```

### Migration Scripts

```bash
# Migrate individual document to new structure
./migrate-document.sh <source> <destination>

# Migrate entire category
./migrate-category.sh <category-name>

# Rollback migration if issues occur
./rollback-migration.sh <backup-id>
```

---

## 🚀 Usage

### Pre-commit Hook Integration

Scripts are automatically run via pre-commit hooks:

```bash
# Install hooks
npm run docs:install-hooks

# Run validation manually
npm run docs:validate
```

### CI/CD Integration

Validation runs automatically in GitHub Actions:
- On every PR touching `/docs/` folder
- On merge to main branch
- Nightly full documentation audit

---

## 📝 Script Standards

**All scripts MUST:**
- Exit 0 on success, 1 on failure
- Provide clear error messages
- Be executable (`chmod +x`)
- Include usage documentation
- Be idempotent (safe to run multiple times)

**Script template:**
```bash
#!/bin/bash
# Script: script-name.sh
# Purpose: [Brief description]
# Usage: ./script-name.sh [args]

set -e  # Exit on error

# Help text
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [args]"
    echo "Description: [What this script does]"
    exit 0
fi

# Script logic here
echo "✓ Task complete"
```

---

## 🎯 Development Roadmap

**Phase 1: Core Validation** (Current)
- [ ] `validate-structure.sh` - Sprint structure validation
- [ ] `validate-readmes.sh` - README section validation
- [ ] `check-links.sh` - Internal link validation

**Phase 2: Maintenance** (Next)
- [ ] `fix-naming.sh` - Automated file renaming
- [ ] `update-readme-dates.sh` - Date freshness
- [ ] `generate-metrics.sh` - Quality metrics

**Phase 3: Migration** (Future)
- [ ] `migrate-document.sh` - Safe document migration
- [ ] `update-links.sh` - Link rewriting during migration

---

## 🔗 Related Documentation

- [Documentation Governance](/docs/quality/DOCUMENTATION-GOVERNANCE.md) - Rules these scripts enforce
- [Pre-commit Hooks Setup](/docs/guides/) - Hook installation guide
- [CI/CD Documentation](/docs/processes/) - Automation pipeline

---

**Maintained by:** Development Team
**Review Cycle:** Per script addition/update
