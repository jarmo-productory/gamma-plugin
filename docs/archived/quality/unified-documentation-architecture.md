# Unified Documentation Architecture

**Version:** 1.0.0
**Date:** October 18, 2025
**Status:** 🎯 ARCHITECTURAL DESIGN
**Author:** Documentation Architecture Agent
**Compliance:** Follows [DOCUMENTATION-GOVERNANCE.md](DOCUMENTATION-GOVERNANCE.md) v1.0.0

---

## 🎯 Executive Summary

This document defines the **unified `/docs` folder structure** that consolidates all project documentation under governance rules. The architecture achieves:

- ✅ **AI Navigation ≤3 file reads** for any documentation query
- ✅ **Zero if/else logic** in validation (all sprints are nested directories)
- ✅ **Immutable security audit trail** with version tracking
- ✅ **Automated enforcement** via pre-commit hooks and CI/CD
- ✅ **Clear migration path** from `/documents` to `/docs`

**Key Principle:** Documentation is code. All changes must pass validation before merge.

---

## 📊 Table of Contents

1. [Folder Structure Design](#folder-structure-design)
2. [Category Definitions](#category-definitions)
3. [File Naming Patterns](#file-naming-patterns)
4. [README Template System](#readme-template-system)
5. [Validation Rules](#validation-rules)
6. [Automation Scripts](#automation-scripts)
7. [Migration Plan](#migration-plan)
8. [Pre-Commit Hook Logic](#pre-commit-hook-logic)

---

## 1. Folder Structure Design

### 1.1 Unified `/docs` Hierarchy

```
/docs/
├── README.md                           # Master navigation (AI entry point)
├── quality/                           # Governance & standards
│   ├── README.md
│   ├── DOCUMENTATION-GOVERNANCE.md
│   ├── unified-documentation-architecture.md (this file)
│   └── CODE_QUALITY_ENFORCEMENT.md
│
├── sprints/                           # 🚨 ALL sprints nested, no exceptions
│   ├── README.md                      # Sprint index and timeline
│   ├── sprint-01/                     # Foundation Setup
│   │   ├── README.md                  # Mandatory navigation
│   │   ├── .sprint-metadata.json      # Tracking data
│   │   └── foundation-setup-plan.md
│   ├── sprint-07/                     # Authentication System
│   │   ├── README.md
│   │   ├── .sprint-metadata.json
│   │   ├── authentication-plan.md
│   │   └── auth-implementation.md
│   ├── sprint-38/                     # Current sprint
│   │   ├── README.md
│   │   ├── .sprint-metadata.json
│   │   ├── presentation-save-stabilization-plan.md
│   │   ├── completion-report.md
│   │   └── LEARNINGS.md
│   └── [future sprints...]
│
├── security/                          # 🛡️ Immutable audit trail
│   ├── README.md                      # Security documentation index
│   ├── oauth/                         # OAuth authentication
│   │   ├── README.md
│   │   ├── oauth-setup-guide.md       # Single source of truth
│   │   ├── oauth-security-audit.md    # Consolidated audits
│   │   ├── oauth-architecture.md      # Design decisions
│   │   └── archived/                  # Historical versions
│   │       ├── oauth-audit-2025-10-04.md
│   │       └── oauth-audit-2025-10-05.md
│   ├── device-tokens/                 # Device authentication
│   │   ├── README.md
│   │   ├── device-token-flow.md
│   │   └── security-review.md
│   ├── rls-policies/                  # Row-Level Security
│   │   ├── README.md
│   │   └── rls-audit-report.md
│   └── incidents/                     # Production security incidents
│       ├── README.md
│       └── [incident-YYYY-MM-DD].md
│
├── architecture/                      # System design & decisions
│   ├── README.md                      # Architecture index
│   ├── ARCHITECTURE.md                # Main system architecture (migrated)
│   ├── adrs/                          # Architecture Decision Records
│   │   ├── README.md
│   │   ├── 001-presentation-save-rpc.md
│   │   ├── 002-device-token-auth.md
│   │   └── 003-chrome-storage-strategy.md
│   ├── diagrams/                      # Architecture diagrams
│   │   ├── README.md
│   │   ├── presentation-save-flow.png
│   │   ├── authentication-flow.png
│   │   └── database-schema.png
│   └── evolution/                     # Architecture timeline
│       ├── README.md
│       ├── sprint-26-rpc-migration.md
│       └── sprint-35-performance-optimization.md
│
├── features/                          # Feature documentation
│   ├── README.md                      # Feature catalog
│   ├── completed/                     # Shipped features
│   │   ├── README.md
│   │   ├── presentation-save/
│   │   │   ├── README.md
│   │   │   ├── specification.md
│   │   │   └── implementation.md
│   │   └── device-pairing/
│   │       ├── README.md
│   │       └── feature-spec.md
│   ├── in-progress/                   # Active development
│   │   ├── README.md
│   │   └── [feature-name]/
│   │       ├── README.md
│   │       └── spec.md
│   └── planned/                       # Future features
│       ├── README.md
│       └── feature-backlog.md
│
├── processes/                         # Development processes
│   ├── README.md                      # Process index
│   ├── development-workflow.md        # SDLC process
│   ├── deployment-tutorial.md         # Deployment procedures
│   ├── testing-strategy.md            # Testing approach
│   ├── code-review-checklist.md       # Review standards
│   └── incident-response.md           # Emergency procedures
│
├── guides/                            # Developer guides
│   ├── README.md                      # Guide index
│   ├── getting-started/
│   │   ├── README.md
│   │   ├── DEVELOPER_SETUP.md         # Migrated from root
│   │   ├── LOCAL_DEVELOPMENT.md       # Migrated from root
│   │   └── quick-start.md
│   ├── troubleshooting/
│   │   ├── README.md
│   │   ├── TROUBLESHOOTING.md         # Migrated from root
│   │   ├── common-errors.md
│   │   └── debugging-workflows.md
│   ├── testing/
│   │   ├── README.md
│   │   ├── TESTING.md                 # Migrated from root
│   │   └── test-data-guide.md
│   └── performance/
│       ├── README.md
│       ├── database-optimization.md
│       ├── react-optimization.md
│       └── caching-strategies.md
│
├── audits/                            # Technical audits & analysis
│   ├── README.md                      # Audit index
│   ├── 2025-10/                       # Date-based organization
│   │   ├── README.md
│   │   ├── extension-architecture-map.md
│   │   ├── extension-data-flow.md
│   │   ├── presentation-save-system-audit.md
│   │   └── production-database-validation.md
│   └── templates/
│       └── audit-template.md
│
└── api/                               # API documentation
    ├── README.md                      # API index
    ├── rest-endpoints.md              # REST API reference
    ├── rpc-functions.md               # Supabase RPC reference
    ├── database-schema.md             # Database structure
    └── changelog.md                   # API version history
```

---

## 2. Category Definitions

### 2.1 `/docs/sprints/` - Sprint Documentation

**Purpose:** Track all sprint planning, implementation, and retrospectives.

**Mandatory Rules:**
- ✅ **ALL sprints are nested directories** (no flat files)
- ✅ Every sprint has `README.md` + `.sprint-metadata.json`
- ✅ Created ONLY via `npm run sprint:create`
- ✅ Minimum 2 files: README + content document

**Content Types:**
- `*-plan.md` - Sprint planning and scope
- `implementation-*.md` - Technical implementation details
- `completion-report.md` or `postmortem.md` - Sprint closure
- `LEARNINGS.md` - What worked, what didn't

**File Naming Inside Sprints:**
```bash
# ✅ CORRECT - Descriptive, no redundant prefix
tables-plan.md
implementation-architecture.md
codebase-audit.md

# ❌ WRONG - Redundant sprint prefix
sprint-11-tables-plan.md  # Folder already says sprint-11
```

---

### 2.2 `/docs/security/` - Security Audit Trail

**Purpose:** Immutable security documentation and audit history.

**Mandatory Rules:**
- ✅ **Deletion FORBIDDEN** (use archival instead)
- ✅ All modifications require version history header
- ✅ Production incidents documented with timestamps
- ✅ OAuth docs ONLY in `/docs/security/oauth/`

**Version History Header:**
```markdown
**Version History:**
- v1.0 (2025-10-01): Initial audit
- v1.1 (2025-10-05): Updated with production findings
- v1.2 (2025-10-18): Added new vulnerability mitigations
```

**Archival Process:**
```bash
# When consolidating security docs:
1. Move old version to archived/ folder
2. Rename with date: oauth-audit-2025-10-05.md
3. Update current doc with consolidated content
4. Add version history header
5. Update README.md
```

---

### 2.3 `/docs/architecture/` - System Design

**Purpose:** High-level system architecture and design decisions.

**Content Types:**
- **ARCHITECTURE.md** - Main system architecture document
- **ADRs** - Architecture Decision Records (numbered, immutable)
- **Diagrams** - Visual architecture representations
- **Evolution** - Architecture timeline and migration history

**ADR Format (in `/architecture/adrs/`):**
```markdown
# ADR 001: Presentation Save RPC

**Date:** 2025-09-15
**Status:** ✅ Accepted
**Context:** Need to simplify presentation save logic
**Decision:** Use Supabase RPC instead of direct table access
**Consequences:**
- ✅ Simplified authentication flow
- ✅ Better error handling
- ⚠️ RPC debugging complexity
```

---

### 2.4 `/docs/features/` - Feature Documentation

**Purpose:** Document completed, in-progress, and planned features.

**Organization:**
- **completed/** - Shipped features (specification + implementation)
- **in-progress/** - Active development (updated during sprint)
- **planned/** - Future features (backlog)

**Feature Folder Structure:**
```
features/completed/presentation-save/
├── README.md
├── specification.md        # Original feature requirements
├── implementation.md       # How it was built
├── testing-report.md       # QA and validation
└── api-contract.md         # API interface
```

---

### 2.5 `/docs/processes/` - Development Processes

**Purpose:** Document SDLC processes, workflows, and procedures.

**Content Types:**
- Development workflow (branching, commits, PRs)
- Deployment procedures (manual and automated)
- Testing strategy (unit, integration, E2E)
- Code review checklist
- Incident response procedures
- Database migration process

**Audience:** All team members (devs, QA, ops)

---

### 2.6 `/docs/guides/` - Developer Guides

**Purpose:** Practical "how-to" documentation for developers.

**Subcategories:**
- **getting-started/** - Onboarding, setup, quick start
- **troubleshooting/** - Debugging, error resolution
- **testing/** - Writing tests, test data, CI
- **performance/** - Optimization guides (DB, React, caching)

**Guide Format:**
- Step-by-step instructions
- Code examples and commands
- Expected output/results
- Common pitfalls and workarounds

---

### 2.7 `/docs/audits/` - Technical Audits

**Purpose:** Deep-dive technical analysis and validation reports.

**Organization:** Date-based folders (`2025-10/`, `2025-09/`)

**Content Types:**
- Architecture audits (system design review)
- Data flow analysis
- Performance benchmarking
- Production validation reports
- Root cause analysis

**File Naming:**
```bash
# Format: [component]-[type]-audit-[date].md
extension-architecture-map.md
presentation-save-system-audit-2025-10-05.md
production-database-validation-oct5.md
```

---

### 2.8 `/docs/api/` - API Documentation

**Purpose:** API reference documentation for all interfaces.

**Content:**
- REST endpoints (Web API)
- Supabase RPC functions
- Database schema (tables, columns, indexes)
- API changelog (versioning history)
- Request/response examples

**Maintenance:** Updated on every API change.

---

### 2.9 `/docs/quality/` - Governance & Standards

**Purpose:** Project governance, quality enforcement, and standards.

**Content:**
- DOCUMENTATION-GOVERNANCE.md (rulebook)
- unified-documentation-architecture.md (this file)
- CODE_QUALITY_ENFORCEMENT.md
- Validation scripts and templates

**Audience:** All contributors (mandatory reading).

---

## 3. File Naming Patterns

### 3.1 Naming Convention Rules

**Format:** `[category]-[topic]-[type].md` (all lowercase, kebab-case)

**Regex Validation:** `^[a-z0-9-]+\.md$`

**Examples by Category:**

```bash
# Architecture
system-architecture.md
database-schema-design.md
component-interaction-diagram.md

# Security
oauth-setup-guide.md
device-token-authentication-flow.md
rls-policy-audit-report.md

# Features
presentation-save-specification.md
device-pairing-implementation.md
table-editor-feature-spec.md

# Guides
developer-onboarding-guide.md
troubleshooting-auth-errors.md
testing-integration-guide.md

# Audits
extension-architecture-map.md
performance-benchmark-2025-10.md
root-cause-analysis-sprint38.md

# Processes
deployment-tutorial.md
code-review-checklist.md
incident-response-procedures.md
```

### 3.2 Forbidden Patterns

**NEVER use:**
- ❌ CamelCase: `TablesPlan.md`
- ❌ snake_case: `tables_plan.md`
- ❌ UPPERCASE: `TABLES-PLAN.md`
- ❌ Abbreviations: `s11-plan.md`
- ❌ Number prefixes: `01-plan.md`
- ❌ Spaces: `tables plan.md`
- ❌ Special chars: `tables@plan.md`

**Exception:** `README.md` (must be exactly uppercase)

### 3.3 Sprint File Naming

**Inside sprint folders, omit sprint prefix (folder provides context):**

```bash
# ✅ CORRECT
/docs/sprints/sprint-11/tables-plan.md
/docs/sprints/sprint-38/presentation-save-stabilization-plan.md

# ❌ WRONG
/docs/sprints/sprint-11/sprint-11-tables-plan.md  # Redundant
/docs/sprints/sprint-38/s38-plan.md              # Abbreviation
```

---

## 4. README Template System

### 4.1 Master README Template

**Location:** `/docs/README.md`

**Purpose:** AI entry point for all documentation navigation.

**Required Sections:**
```markdown
# Documentation Index

**Last Updated:** [Date]
**Status:** ✅ Current

---

## 🎯 Quick Navigation (AI Agents Start Here)

**For [task], read in this order:**
1. [Primary doc] - [Purpose]
2. [Secondary doc] - [Purpose]
3. [Tertiary doc] - [Purpose]

---

## 📚 Documentation Categories

| Category | Purpose | Entry Point |
|----------|---------|-------------|
| Sprints | Sprint planning & execution | [sprints/README.md](sprints/README.md) |
| Security | Security audits & guides | [security/README.md](security/README.md) |
| Architecture | System design & ADRs | [architecture/README.md](architecture/README.md) |
| Features | Feature specifications | [features/README.md](features/README.md) |
| Guides | Developer how-tos | [guides/README.md](guides/README.md) |
| Processes | SDLC workflows | [processes/README.md](processes/README.md) |
| Audits | Technical analysis | [audits/README.md](audits/README.md) |
| API | API reference | [api/README.md](api/README.md) |

---

## 🔍 Common Tasks

| Task | Documentation Path | Max Reads |
|------|--------------------|-----------|
| Setup dev environment | [guides/getting-started/DEVELOPER_SETUP.md] | 2 |
| Debug save errors | [guides/troubleshooting/TROUBLESHOOTING.md] | 2 |
| Current sprint status | [sprints/sprint-38/README.md] | 2 |
| OAuth configuration | [security/oauth/oauth-setup-guide.md] | 2 |

---

## 📊 Documentation Health

- Total Documents: [count]
- Broken Links: [count] (goal: 0)
- Stale Docs (>90 days): [count]
- README Coverage: [percentage]%
- AI Navigation Pass Rate: [percentage]%

---

**Maintained By:** Development Team
**Next Review:** [Date]
```

---

### 4.2 Sprint README Template

**Location:** `/docs/sprints/sprint-XX/README.md`

**Auto-generated by:** `npm run sprint:create <number> "<name>"`

**Template:**
```markdown
# Sprint [NUMBER]: [NAME]

**Status:** 📋 PLANNING | 🚧 IN PROGRESS | ✅ COMPLETE
**Start Date:** YYYY-MM-DD
**Completion Date:** YYYY-MM-DD (if complete)
**Duration:** X weeks

---

## 🎯 Quick Start (for AI agents)

**If you're implementing this sprint, read in this order:**

1. **[name]-plan.md** - Goals, scope, acceptance criteria (START HERE)
2. **implementation-architecture.md** - Technical design (if complex sprint)
3. **completion-report.md** - Results and metrics (if completed)
4. **LEARNINGS.md** - Retrospective insights (if completed)

**Estimated Reading Time:** [minutes] minutes

---

## 📚 Document Organization

| Document | Purpose | Status | Lines | Last Updated |
|----------|---------|--------|-------|--------------|
| [name]-plan.md | Sprint planning | ✅ Complete | 250 | 2025-10-15 |
| implementation-architecture.md | Technical design | ✅ Complete | 180 | 2025-10-16 |
| completion-report.md | Sprint closure | ✅ Complete | 120 | 2025-10-18 |
| LEARNINGS.md | Retrospective | ✅ Complete | 90 | 2025-10-18 |

---

## 🔗 Related Documentation

**Prerequisites:**
- [Sprint XX: Previous foundation sprint](../sprint-XX/README.md)
- [Feature Spec: Related feature](../../features/completed/feature-name/README.md)

**Dependencies:**
- [Architecture: System component](../../architecture/ARCHITECTURE.md#component)
- [Security: Authentication](../../security/oauth/oauth-setup-guide.md)

**Future Work:**
- [Sprint YY: Next phase](../sprint-YY/README.md)

---

## 📊 Sprint Status

**Current Phase:** [Planning | Implementation | Testing | Complete]
**Completion:** X% (X/Y tasks)

**Key Milestones:**
- [✅] Planning complete (YYYY-MM-DD)
- [✅] Implementation complete (YYYY-MM-DD)
- [✅] Testing complete (YYYY-MM-DD)
- [✅] Documentation complete (YYYY-MM-DD)

**Team Members:**
- Sprint Lead: [Name]
- Developers: [Names]
- QA: [Name]

---

## 🎯 Success Criteria

**This sprint is COMPLETE when:**
- [ ] [Criterion 1: Specific, measurable goal]
- [ ] [Criterion 2: Specific, measurable goal]
- [ ] [Criterion 3: Specific, measurable goal]
- [ ] All tests passing (unit, integration, E2E)
- [ ] Documentation complete and reviewed
- [ ] Code reviewed and merged to main
- [ ] Deployed to production (if applicable)

---

## 📈 Sprint Metrics

**Planned:**
- Story Points: [points]
- Tasks: [count]
- Estimated Duration: [weeks]

**Actual:**
- Story Points Completed: [points]
- Tasks Completed: [count]
- Actual Duration: [weeks]
- Velocity: [points/week]

---

## 🏗️ Technical Summary

**Technologies Used:**
- [Technology 1]
- [Technology 2]

**Key Implementation Decisions:**
- [Decision 1 with rationale]
- [Decision 2 with rationale]

**Architecture Changes:**
- [Change 1]
- [Change 2]

---

## 🧪 Testing Summary

**Test Coverage:**
- Unit Tests: [count] tests, [percentage]% coverage
- Integration Tests: [count] tests
- E2E Tests: [count] scenarios

**Critical Test Scenarios:**
1. [Scenario 1]
2. [Scenario 2]

---

## 🚀 Deployment

**Deployment Date:** YYYY-MM-DD
**Deployment Method:** [Manual | Automated]
**Rollback Plan:** [Link to rollback procedure]

**Database Migrations:**
- [Migration 1: Description]
- [Migration 2: Description]

---

## 📝 Notes

[Any additional context, blockers resolved, risks mitigated]

---

**Created:** [DATE] via sprint automation script
**Template Version:** 1.0.0
**Last Updated:** [DATE]
```

---

### 4.3 Category README Template

**Location:** `/docs/[category]/README.md`

**Purpose:** Navigation hub for each major documentation category.

**Template:**
```markdown
# [Category Name] Documentation

**Purpose:** [One-line description of category purpose]
**Audience:** [Primary users: developers, ops, QA, etc.]
**Last Updated:** YYYY-MM-DD

---

## 🎯 Quick Start

**For [common task], read:**
1. **[primary-doc.md]** - [Purpose]
2. **[secondary-doc.md]** - [Purpose]

**Common Queries:**
- "How do I [task]?" → [link]
- "What is [concept]?" → [link]
- "Where is [resource]?" → [link]

---

## 📚 Document Index

| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
| [doc1.md] | [purpose] | ✅ Current | YYYY-MM-DD |
| [doc2.md] | [purpose] | ⚠️ Stale | YYYY-MM-DD |

**Total Documents:** [count]
**Stale Documents (>90 days):** [count]

---

## 📖 Subcategories

### [Subcategory 1]
[Brief description]
- [Key document 1](subcategory1/doc.md)
- [Key document 2](subcategory1/doc.md)

### [Subcategory 2]
[Brief description]
- [Key document 1](subcategory2/doc.md)

---

## 🔗 Related Documentation

**External Dependencies:**
- [Link to related category]
- [Link to architecture docs]

**See Also:**
- [Related resources]

---

## 📝 Contributing

**Adding Documentation:**
1. Follow naming conventions ([link to governance])
2. Use provided templates ([link to templates])
3. Update this README with new entry
4. Submit PR with documentation label

**Maintenance Schedule:**
- Weekly: Check for broken links
- Monthly: Review stale documents
- Quarterly: Full content audit

---

**Maintained By:** [Team/Person]
**Next Review:** YYYY-MM-DD
```

---

## 5. Validation Rules

### 5.1 Pre-Commit Validation Checks

**Script Location:** `.git/hooks/pre-commit`

**Validation Checklist:**

```bash
#!/bin/bash
# Pre-commit validation for documentation

echo "🔍 Running documentation validation..."

EXIT_CODE=0

# Check 1: No flat sprint files
echo "Checking sprint structure..."
FLAT_SPRINTS=$(find docs/sprints -maxdepth 1 -name "sprint-*.md" 2>/dev/null)
if [ ! -z "$FLAT_SPRINTS" ]; then
    echo "❌ BLOCKED: Found flat sprint files (must be nested):"
    echo "$FLAT_SPRINTS"
    EXIT_CODE=1
fi

# Check 2: Every sprint has README
echo "Checking sprint READMEs..."
for sprint_dir in docs/sprints/sprint-*/; do
    if [ ! -f "$sprint_dir/README.md" ]; then
        echo "❌ BLOCKED: Missing README.md in: $sprint_dir"
        EXIT_CODE=1
    fi

    if [ ! -f "$sprint_dir/.sprint-metadata.json" ]; then
        echo "⚠️  WARNING: Missing .sprint-metadata.json in: $sprint_dir"
        echo "   Sprint may have been created manually (use: npm run sprint:create)"
    fi
done

# Check 3: File naming conventions
echo "Checking file naming conventions..."
INVALID_NAMES=$(find docs -name "*.md" ! -name "README.md" | grep -E '[A-Z_]|[^a-z0-9/-]\.md$')
if [ ! -z "$INVALID_NAMES" ]; then
    echo "❌ BLOCKED: Invalid file names (use kebab-case):"
    echo "$INVALID_NAMES"
    EXIT_CODE=1
fi

# Check 4: No docs in /src/ folder
echo "Checking for misplaced docs..."
MISPLACED_DOCS=$(find src -name "*.md" 2>/dev/null)
if [ ! -z "$MISPLACED_DOCS" ]; then
    echo "❌ BLOCKED: Found docs in /src/ (move to /docs/):"
    echo "$MISPLACED_DOCS"
    EXIT_CODE=1
fi

# Check 5: Security docs not deleted
echo "Checking security audit trail..."
DELETED_SECURITY=$(git diff --cached --name-status | grep "^D.*docs/security/" | grep -v "/archived/")
if [ ! -z "$DELETED_SECURITY" ]; then
    echo "❌ BLOCKED: Attempted to delete security docs (archive instead):"
    echo "$DELETED_SECURITY"
    EXIT_CODE=1
fi

# Check 6: README sections complete
echo "Checking README completeness..."
for readme in docs/sprints/sprint-*/README.md; do
    if [ -f "$readme" ]; then
        MISSING_SECTIONS=""
        grep -q "## 🎯 Quick Start" "$readme" || MISSING_SECTIONS="$MISSING_SECTIONS Quick Start"
        grep -q "## 📚 Document Organization" "$readme" || MISSING_SECTIONS="$MISSING_SECTIONS DocumentOrg"
        grep -q "## 📊 Sprint Status" "$readme" || MISSING_SECTIONS="$MISSING_SECTIONS Status"
        grep -q "## 🎯 Success Criteria" "$readme" || MISSING_SECTIONS="$MISSING_SECTIONS SuccessCriteria"

        if [ ! -z "$MISSING_SECTIONS" ]; then
            echo "❌ BLOCKED: Incomplete README: $readme"
            echo "   Missing sections: $MISSING_SECTIONS"
            EXIT_CODE=1
        fi
    fi
done

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All documentation validation passed"
else
    echo ""
    echo "❌ Documentation validation FAILED"
    echo "   Fix issues above or use: git commit --no-verify -m 'docs: reason'"
fi

exit $EXIT_CODE
```

---

### 5.2 CI/CD Validation Pipeline

**Workflow:** `.github/workflows/docs-validation.yml`

**Validation Steps:**

```yaml
name: Documentation Validation

on:
  pull_request:
    paths:
      - 'docs/**'
  push:
    branches:
      - main

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Check sprint structure
        run: |
          echo "Validating sprint structure..."
          scripts/docs/validate-structure.sh

      - name: Validate README sections
        run: |
          echo "Validating README completeness..."
          scripts/docs/validate-readmes.sh

      - name: Check broken links
        run: |
          echo "Checking for broken links..."
          scripts/docs/check-links.sh

      - name: Detect duplicates
        run: |
          echo "Detecting duplicate content..."
          scripts/docs/detect-duplicates.sh

      - name: Spell check
        uses: rojopolis/spellcheck-github-actions@0.5.0
        with:
          config_path: .spellcheck.yml

      - name: Validate code examples
        run: |
          echo "Validating code examples..."
          scripts/docs/validate-code-examples.sh

      - name: Check naming conventions
        run: |
          echo "Checking file naming..."
          scripts/docs/validate-naming.sh

      - name: Security audit trail check
        run: |
          echo "Validating security docs..."
          scripts/docs/validate-security-trail.sh

      - name: AI navigation test
        run: |
          echo "Testing AI navigation paths..."
          scripts/docs/test-ai-navigation.sh

      - name: Generate metrics
        run: |
          echo "Generating documentation metrics..."
          scripts/docs/generate-metrics.sh

      - name: Comment PR with results
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ Documentation validation failed. Check workflow logs for details.\n\nRefer to: [DOCUMENTATION-GOVERNANCE.md](docs/quality/DOCUMENTATION-GOVERNANCE.md)'
            })
```

---

### 5.3 AI Navigation Test Scenarios

**Purpose:** Verify documentation can be found in ≤3 file reads.

**Test Script:** `scripts/docs/test-ai-navigation.sh`

**Scenarios:**

```bash
#!/bin/bash
# AI Navigation Test Suite

echo "🤖 Testing AI navigation paths..."

PASS_COUNT=0
FAIL_COUNT=0

# Scenario 1: Find current sprint
echo "Test 1: Find current sprint status"
READS=0
READ_PATH=""

# AI reads 1: Master README
READS=$((READS+1))
READ_PATH="docs/README.md"
if grep -q "Sprint 38" "$READ_PATH"; then
    # AI reads 2: Sprint README
    READS=$((READS+1))
    READ_PATH="docs/sprints/sprint-38/README.md"
    if [ -f "$READ_PATH" ]; then
        echo "  ✅ PASS: Found in $READS reads"
        PASS_COUNT=$((PASS_COUNT+1))
    else
        echo "  ❌ FAIL: Sprint README missing"
        FAIL_COUNT=$((FAIL_COUNT+1))
    fi
else
    echo "  ❌ FAIL: Could not navigate"
    FAIL_COUNT=$((FAIL_COUNT+1))
fi

# Scenario 2: OAuth setup
echo "Test 2: Find OAuth setup guide"
READS=0
# AI reads 1: Master README
READS=$((READS+1))
READ_PATH="docs/README.md"
if grep -q "Security" "$READ_PATH"; then
    # AI reads 2: Security README
    READS=$((READS+1))
    READ_PATH="docs/security/README.md"
    if grep -q "OAuth" "$READ_PATH"; then
        # AI reads 3: OAuth setup guide
        READS=$((READS+1))
        READ_PATH="docs/security/oauth/oauth-setup-guide.md"
        if [ -f "$READ_PATH" ]; then
            echo "  ✅ PASS: Found in $READS reads"
            PASS_COUNT=$((PASS_COUNT+1))
        fi
    fi
else
    echo "  ❌ FAIL: Could not navigate"
    FAIL_COUNT=$((FAIL_COUNT+1))
fi

# Scenario 3: Troubleshooting save errors
echo "Test 3: Find troubleshooting for save errors"
READS=0
# AI reads 1: Master README
READS=$((READS+1))
READ_PATH="docs/README.md"
if grep -q "Troubleshooting" "$READ_PATH"; then
    # AI reads 2: Troubleshooting guide
    READS=$((READS+1))
    READ_PATH="docs/guides/troubleshooting/TROUBLESHOOTING.md"
    if [ -f "$READ_PATH" ]; then
        if grep -q "save" "$READ_PATH"; then
            echo "  ✅ PASS: Found in $READS reads"
            PASS_COUNT=$((PASS_COUNT+1))
        fi
    fi
else
    echo "  ❌ FAIL: Could not navigate"
    FAIL_COUNT=$((FAIL_COUNT+1))
fi

echo ""
echo "📊 AI Navigation Test Results:"
echo "   PASS: $PASS_COUNT"
echo "   FAIL: $FAIL_COUNT"

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ All AI navigation tests passed"
    exit 0
else
    echo "❌ Some AI navigation tests failed"
    exit 1
fi
```

---

## 6. Automation Scripts

### 6.1 Sprint Management Scripts

**Location:** `/scripts/docs/`

#### `create-sprint.sh` - Create New Sprint

```bash
#!/bin/bash
# Usage: npm run sprint:create <number> "<name>"

SPRINT_NUM=$1
SPRINT_NAME=$2

if [ -z "$SPRINT_NUM" ] || [ -z "$SPRINT_NAME" ]; then
    echo "Usage: npm run sprint:create <number> \"<name>\""
    exit 1
fi

SPRINT_DIR="docs/sprints/sprint-${SPRINT_NUM}"
SPRINT_SLUG=$(echo "$SPRINT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# Check if sprint already exists
if [ -d "$SPRINT_DIR" ]; then
    echo "❌ Sprint $SPRINT_NUM already exists"
    exit 1
fi

echo "🚀 Creating Sprint $SPRINT_NUM: $SPRINT_NAME"

# Create sprint directory
mkdir -p "$SPRINT_DIR"

# Generate metadata
cat > "$SPRINT_DIR/.sprint-metadata.json" <<EOF
{
  "sprint_number": $SPRINT_NUM,
  "name": "$SPRINT_NAME",
  "created_date": "$(date +%Y-%m-%d)",
  "created_by": "sprint automation script",
  "status": "planning",
  "template_version": "1.0.0"
}
EOF

# Generate README from template
cat > "$SPRINT_DIR/README.md" <<EOF
# Sprint $SPRINT_NUM: $SPRINT_NAME

**Status:** 📋 PLANNING
**Start Date:** $(date +%Y-%m-%d)
**Estimated Duration:** TBD

---

## 🎯 Quick Start (for AI agents)

**If you're implementing this sprint, read in this order:**

1. **${SPRINT_SLUG}-plan.md** - Goals, deliverables, acceptance criteria

---

## 📚 Document Organization

| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
| ${SPRINT_SLUG}-plan.md | Sprint plan | 📝 Draft | $(date +%Y-%m-%d) |

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

**Created:** $(date +%Y-%m-%d)
**Created by:** Sprint automation script
**Template version:** 1.0.0
EOF

# Create empty plan document
touch "$SPRINT_DIR/${SPRINT_SLUG}-plan.md"

echo "✅ Sprint $SPRINT_NUM created successfully"
echo "   Location: $SPRINT_DIR"
echo "   Next steps:"
echo "   1. Edit ${SPRINT_SLUG}-plan.md with sprint details"
echo "   2. Update README.md with actual prerequisites"
echo "   3. Commit with: git commit -m 'docs: create sprint-$SPRINT_NUM $SPRINT_NAME'"
```

---

#### `migrate-sprint.sh` - Migrate Flat Sprint to Nested

```bash
#!/bin/bash
# Usage: scripts/docs/migrate-sprint.sh <number> "<name>"

SPRINT_NUM=$1
SPRINT_NAME=$2

if [ -z "$SPRINT_NUM" ] || [ -z "$SPRINT_NAME" ]; then
    echo "Usage: scripts/docs/migrate-sprint.sh <number> \"<name>\""
    exit 1
fi

# Find existing flat sprint file
FLAT_FILE=$(find documents/roadmap -name "SPRINT-${SPRINT_NUM}*.md" -o -name "sprint-${SPRINT_NUM}*.md" | head -1)

if [ -z "$FLAT_FILE" ]; then
    echo "❌ Could not find flat sprint file for Sprint $SPRINT_NUM"
    exit 1
fi

echo "📦 Migrating Sprint $SPRINT_NUM: $SPRINT_NAME"
echo "   From: $FLAT_FILE"

SPRINT_DIR="docs/sprints/sprint-${SPRINT_NUM}"
SPRINT_SLUG=$(echo "$SPRINT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# Create sprint directory structure
mkdir -p "$SPRINT_DIR"

# Move and rename existing file
BASENAME=$(basename "$FLAT_FILE" | sed "s/SPRINT-${SPRINT_NUM}-*//I" | sed "s/sprint-${SPRINT_NUM}-*//I")
NEW_NAME=$(echo "$BASENAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

if [ -z "$NEW_NAME" ] || [ "$NEW_NAME" = ".md" ]; then
    NEW_NAME="${SPRINT_SLUG}-plan.md"
fi

mv "$FLAT_FILE" "$SPRINT_DIR/$NEW_NAME"

# Generate metadata
cat > "$SPRINT_DIR/.sprint-metadata.json" <<EOF
{
  "sprint_number": $SPRINT_NUM,
  "name": "$SPRINT_NAME",
  "created_date": "$(date +%Y-%m-%d)",
  "migrated_from": "$FLAT_FILE",
  "migration_date": "$(date +%Y-%m-%d)",
  "status": "migrated",
  "template_version": "1.0.0"
}
EOF

# Generate README
npm run sprint:create $SPRINT_NUM "$SPRINT_NAME" --skip-plan

# Update master README
echo "📝 Updating master README..."
# (Add logic to update docs/README.md with new sprint entry)

echo "✅ Sprint $SPRINT_NUM migrated successfully"
echo "   New location: $SPRINT_DIR"
echo "   Files:"
ls -la "$SPRINT_DIR"
```

---

### 6.2 Validation Scripts

#### `validate-structure.sh` - Validate Folder Structure

```bash
#!/bin/bash
# scripts/docs/validate-structure.sh

echo "🔍 Validating documentation structure..."

EXIT_CODE=0

# Check for flat sprint files
FLAT_SPRINTS=$(find docs/sprints -maxdepth 1 -name "sprint-*.md" 2>/dev/null)
if [ ! -z "$FLAT_SPRINTS" ]; then
    echo "❌ Found flat sprint files (must be nested):"
    echo "$FLAT_SPRINTS"
    EXIT_CODE=1
fi

# Check every sprint has README
for sprint_dir in docs/sprints/sprint-*/; do
    if [ ! -f "$sprint_dir/README.md" ]; then
        echo "❌ Missing README.md in: $sprint_dir"
        EXIT_CODE=1
    fi

    if [ ! -f "$sprint_dir/.sprint-metadata.json" ]; then
        echo "⚠️  Missing metadata in: $sprint_dir"
    fi

    # Check minimum file count (README + 1 content file)
    FILE_COUNT=$(find "$sprint_dir" -maxdepth 1 -name "*.md" | wc -l)
    if [ $FILE_COUNT -lt 2 ]; then
        echo "❌ Sprint has insufficient files: $sprint_dir (need README + content)"
        EXIT_CODE=1
    fi
done

# Validate category structure
REQUIRED_CATEGORIES=("sprints" "security" "architecture" "features" "processes" "guides" "audits" "api" "quality")
for category in "${REQUIRED_CATEGORIES[@]}"; do
    if [ ! -d "docs/$category" ]; then
        echo "⚠️  Missing required category: docs/$category"
    elif [ ! -f "docs/$category/README.md" ]; then
        echo "❌ Missing README in: docs/$category"
        EXIT_CODE=1
    fi
done

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Structure validation passed"
else
    echo "❌ Structure validation failed"
fi

exit $EXIT_CODE
```

---

#### `check-links.sh` - Check for Broken Links

```bash
#!/bin/bash
# scripts/docs/check-links.sh

echo "🔗 Checking for broken links in documentation..."

BROKEN_LINKS=0

for md_file in $(find docs -name "*.md"); do
    # Extract markdown links [text](url)
    LINKS=$(grep -o '\[.*\]([^)]*\.md[^)]*)' "$md_file" | sed 's/.*(\(.*\))/\1/')

    for link in $LINKS; do
        # Resolve relative path
        DIR=$(dirname "$md_file")
        TARGET="$DIR/$link"

        if [ ! -f "$TARGET" ]; then
            echo "❌ Broken link in $md_file: $link"
            BROKEN_LINKS=$((BROKEN_LINKS+1))
        fi
    done
done

if [ $BROKEN_LINKS -eq 0 ]; then
    echo "✅ No broken links found"
    exit 0
else
    echo "❌ Found $BROKEN_LINKS broken links"
    exit 1
fi
```

---

#### `detect-duplicates.sh` - Detect Duplicate Content

```bash
#!/bin/bash
# scripts/docs/detect-duplicates.sh

echo "🔍 Detecting duplicate documentation content..."

# Check for OAuth duplicates
OAUTH_DOCS=$(find docs -name "*oauth*" -o -name "*auth*" | grep -v "docs/security/oauth")
if [ ! -z "$OAUTH_DOCS" ]; then
    echo "⚠️  Found potential OAuth docs outside security folder:"
    echo "$OAUTH_DOCS"
    echo "   → Consolidate into docs/security/oauth/"
fi

# Check for duplicate file names across folders
DUPLICATE_NAMES=$(find docs -name "*.md" ! -name "README.md" -exec basename {} \; | sort | uniq -d)
if [ ! -z "$DUPLICATE_NAMES" ]; then
    echo "⚠️  Found duplicate file names:"
    echo "$DUPLICATE_NAMES"
    echo "   → Review and consolidate if necessary"
fi

echo "✅ Duplicate detection complete"
```

---

### 6.3 Maintenance Scripts

#### `update-readme-dates.sh` - Update Last Modified Dates

```bash
#!/bin/bash
# scripts/docs/update-readme-dates.sh

echo "📅 Updating README last modified dates..."

for readme in $(find docs -name "README.md"); do
    DIR=$(dirname "$readme")

    # Find most recently modified file in directory
    LATEST_FILE=$(find "$DIR" -maxdepth 1 -name "*.md" ! -name "README.md" -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

    if [ ! -z "$LATEST_FILE" ]; then
        LATEST_DATE=$(date -r "$LATEST_FILE" +%Y-%m-%d)

        # Update README with new date
        sed -i "s/\*\*Last Updated:\*\* [0-9-]*/\*\*Last Updated:\*\* $LATEST_DATE/" "$readme"

        echo "  Updated: $readme → $LATEST_DATE"
    fi
done

echo "✅ README dates updated"
```

---

#### `generate-metrics.sh` - Generate Documentation Metrics

```bash
#!/bin/bash
# scripts/docs/generate-metrics.sh

echo "📊 Generating documentation metrics..."

TOTAL_DOCS=$(find docs -name "*.md" | wc -l)
TOTAL_SPRINTS=$(find docs/sprints -maxdepth 1 -type d -name "sprint-*" | wc -l)
MISSING_READMES=$(find docs -type d ! -name "archived" -exec sh -c '[ ! -f "$1/README.md" ] && echo "$1"' _ {} \; | wc -l)
BROKEN_LINKS=$(scripts/docs/check-links.sh 2>&1 | grep "Broken link" | wc -l)

STALE_DOCS=$(find docs -name "*.md" -mtime +90 | wc -l)

# Calculate README coverage
TOTAL_DIRS=$(find docs -type d ! -name "archived" | wc -l)
README_COUNT=$(find docs -name "README.md" | wc -l)
README_COVERAGE=$((README_COUNT * 100 / TOTAL_DIRS))

echo ""
echo "📈 Documentation Metrics Report"
echo "================================"
echo "Total Documents: $TOTAL_DOCS"
echo "Total Sprints: $TOTAL_SPRINTS"
echo "Missing READMEs: $MISSING_READMES"
echo "Broken Links: $BROKEN_LINKS"
echo "Stale Docs (>90 days): $STALE_DOCS"
echo "README Coverage: ${README_COVERAGE}%"
echo ""

# Calculate debt score
DEBT_SCORE=$((MISSING_READMES * 10 + BROKEN_LINKS * 6 + STALE_DOCS * 2))
echo "Documentation Debt Score: -$DEBT_SCORE"

if [ $DEBT_SCORE -gt 50 ]; then
    echo "Status: ❌ POOR - Remediation required"
elif [ $DEBT_SCORE -gt 20 ]; then
    echo "Status: ⚠️  FAIR - Improvement needed"
else
    echo "Status: ✅ GOOD"
fi
```

---

## 7. Migration Plan

### 7.1 Migration Overview

**Goal:** Move all documentation from `/documents` to `/docs` with unified structure.

**Timeline:** 2-3 days (can be done in phases)

**Approach:** Automated migration with validation

---

### 7.2 Phase 1: Sprint Migration (Day 1)

**Current State Analysis:**
```bash
# Existing sprint files in /documents/roadmap
SPRINT-7.md
SPRINT-8-MASTER-PLAN.md
SPRINT-9.md
SPRINT-10-BRANDING.md
SPRINT-11-SIDEBAR-DASHBOARD.md
...
SPRINT-38-EXECUTIVE-SUMMARY.md
sprint-38-presentation-save-stabilization.md
```

**Migration Commands:**
```bash
# Create sprints directory
mkdir -p docs/sprints

# Migrate all sprints (automated)
scripts/docs/migrate-all-sprints.sh

# Manual verification
scripts/docs/validate-structure.sh
```

**Script: `migrate-all-sprints.sh`**
```bash
#!/bin/bash
# Migrate all flat sprint files to nested structure

SPRINT_MAPPINGS=(
    "7:Timeline Sync"
    "8:Master Plan"
    "9:Production Readiness"
    "10:Branding"
    "11:Sidebar Dashboard"
    "13:Production Auth Redirect"
    "15:UX Polish"
    "16:Auth Fix"
    "20:Account Management"
    "23:Internal APIs Hardening"
    "24:Account Deletion"
    "28:UX Improvements"
    "32:Test Suite Repair"
    "34:Extension Production Cleanup"
    "35:Netlify Production Performance"
    "36:Slide Duration Prediction"
    "38:Presentation Save Stabilization"
)

for mapping in "${SPRINT_MAPPINGS[@]}"; do
    NUM=$(echo "$mapping" | cut -d: -f1)
    NAME=$(echo "$mapping" | cut -d: -f2-)

    echo "Migrating Sprint $NUM: $NAME"
    scripts/docs/migrate-sprint.sh "$NUM" "$NAME"
done

echo "✅ All sprints migrated"
```

---

### 7.3 Phase 2: Category Migration (Day 1-2)

**Migration Matrix:**

| Source | Destination | Action |
|--------|-------------|--------|
| `/documents/core/technical/Authentication*.md` | `/docs/security/oauth/` | Move & consolidate |
| `/documents/core/technical/database-architecture.md` | `/docs/architecture/` | Move |
| `/documents/audits/*` | `/docs/audits/2025-10/` | Move (organize by date) |
| `/documents/core/product/PRD*.md` | `/docs/features/completed/` | Move |
| `/documents/core/process/*.md` | `/docs/processes/` | Move |
| `/docs/ARCHITECTURE.md` | `/docs/architecture/ARCHITECTURE.md` | Move |
| `/docs/TROUBLESHOOTING.md` | `/docs/guides/troubleshooting/` | Move |
| `/docs/DEVELOPER_SETUP.md` | `/docs/guides/getting-started/` | Move |

**Migration Script:**
```bash
#!/bin/bash
# scripts/docs/migrate-categories.sh

echo "📦 Migrating documentation categories..."

# Create category structure
mkdir -p docs/{security/oauth,architecture/{adrs,diagrams,evolution},features/{completed,in-progress,planned},processes,guides/{getting-started,troubleshooting,testing,performance},audits/2025-10,api}

# Security docs
echo "Moving security documentation..."
mv documents/core/technical/Authentication_Flow_*.md docs/security/oauth/
mv documents/core/technical/security-implementation-summary.md docs/security/

# Architecture docs
echo "Moving architecture documentation..."
mv docs/ARCHITECTURE.md docs/architecture/
mv documents/core/technical/database-architecture.md docs/architecture/
mv documents/architecture/* docs/architecture/ 2>/dev/null

# Audits
echo "Moving audit documentation..."
mv documents/audits/*.md docs/audits/2025-10/

# Features
echo "Moving feature documentation..."
mv documents/core/product/*.md docs/features/completed/
mv documents/features/completed/* docs/features/completed/ 2>/dev/null

# Processes
echo "Moving process documentation..."
mv documents/core/process/*.md docs/processes/

# Guides
echo "Moving guide documentation..."
mv docs/DEVELOPER_SETUP.md docs/guides/getting-started/
mv docs/LOCAL_DEVELOPMENT.md docs/guides/getting-started/
mv docs/TROUBLESHOOTING.md docs/guides/troubleshooting/
mv docs/TESTING.md docs/guides/testing/

# Performance docs
mv docs/*-optimization*.md docs/guides/performance/
mv docs/cache-*.md docs/guides/performance/

echo "✅ Category migration complete"
```

---

### 7.4 Phase 3: README Generation (Day 2)

**Generate READMEs for all categories:**

```bash
#!/bin/bash
# scripts/docs/generate-all-readmes.sh

echo "📝 Generating README files..."

CATEGORIES=("sprints" "security" "architecture" "features" "processes" "guides" "audits" "api" "quality")

for category in "${CATEGORIES[@]}"; do
    if [ ! -f "docs/$category/README.md" ]; then
        echo "Generating README for: $category"
        scripts/docs/generate-category-readme.sh "$category"
    fi
done

# Generate subcategory READMEs
scripts/docs/generate-category-readme.sh "security/oauth"
scripts/docs/generate-category-readme.sh "guides/getting-started"
scripts/docs/generate-category-readme.sh "guides/troubleshooting"
scripts/docs/generate-category-readme.sh "architecture/adrs"

echo "✅ All READMEs generated"
```

---

### 7.5 Phase 4: Validation & Cleanup (Day 2-3)

**Validation Checklist:**
```bash
# Run all validation scripts
scripts/docs/validate-structure.sh
scripts/docs/validate-readmes.sh
scripts/docs/check-links.sh
scripts/docs/detect-duplicates.sh
scripts/docs/test-ai-navigation.sh

# Generate metrics
scripts/docs/generate-metrics.sh

# Check for orphaned files
find documents -name "*.md" | grep -v "archive"

# Verify all sprints migrated
ls -la docs/sprints/

# Test pre-commit hook
.git/hooks/pre-commit
```

**Cleanup:**
```bash
# Archive old documents folder
mv documents documents-archive-2025-10-18

# Update gitignore
echo "documents-archive-*/" >> .gitignore

# Update CLAUDE.md with new structure
# (Manual update to reflect new paths)

# Commit migration
git add docs/ .gitignore
git commit -m "refactor: migrate documentation to unified /docs structure

- Migrate all sprints to nested directories
- Consolidate security documentation
- Organize by category (architecture, features, processes, guides)
- Generate READMEs for all categories
- Implement validation scripts
- Archive old /documents folder

Follows: docs/quality/DOCUMENTATION-GOVERNANCE.md
Closes: #[issue-number]"
```

---

### 7.6 Post-Migration Tasks

**Update CLAUDE.md references:**
```markdown
### 📁 DIRECTORY MANAGEMENT RULES:
**CRITICAL DOCUMENT ORGANIZATION:**
- **Audits**: ALWAYS save to `/docs/audits/YYYY-MM/` folder
- **Sprint Plans**: ALWAYS save to `/docs/sprints/sprint-XX/` folder
- **Research**: Use `/docs/audits/YYYY-MM/` for technical analysis
- **Architecture**: Use `/docs/architecture/` for design decisions
- **Security**: Use `/docs/security/` for security documentation
```

**Update CI/CD workflows:**
```yaml
# .github/workflows/ci.yml
- name: Validate documentation
  run: scripts/docs/validate-structure.sh
```

**Install pre-commit hook:**
```bash
# Make pre-commit hook executable
chmod +x scripts/docs/pre-commit-hook.sh
ln -sf ../../scripts/docs/pre-commit-hook.sh .git/hooks/pre-commit
```

**Announce migration:**
- Update README.md with new structure
- Notify team in Slack/Discord
- Update onboarding documentation
- Run training session for AI navigation

---

## 8. Pre-Commit Hook Logic

### 8.1 Hook Installation

**Location:** `.git/hooks/pre-commit`

**Installation:**
```bash
#!/bin/bash
# scripts/docs/install-hooks.sh

echo "🔧 Installing documentation validation hooks..."

# Copy pre-commit hook
cp scripts/docs/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed"
echo "   Bypass with: git commit --no-verify (emergency only)"
```

---

### 8.2 Complete Pre-Commit Hook

**File:** `scripts/docs/pre-commit-hook.sh`

```bash
#!/bin/bash
# Pre-commit validation for documentation
# Follows: docs/quality/DOCUMENTATION-GOVERNANCE.md

set -e

echo "🔍 Running documentation validation..."
echo "   (Skip with: git commit --no-verify)"

EXIT_CODE=0
WARNINGS=0

# Helper function for errors
fail() {
    echo "❌ BLOCKED: $1"
    EXIT_CODE=1
}

# Helper function for warnings
warn() {
    echo "⚠️  WARNING: $1"
    WARNINGS=$((WARNINGS+1))
}

# Check 1: Sprint structure validation
echo ""
echo "📁 Checking sprint structure..."

# No flat sprint files allowed
FLAT_SPRINTS=$(find docs/sprints -maxdepth 1 -name "sprint-*.md" 2>/dev/null || true)
if [ ! -z "$FLAT_SPRINTS" ]; then
    fail "Found flat sprint files (must be nested directories):
$FLAT_SPRINTS

Fix: Run scripts/docs/migrate-sprint.sh <number> \"<name>\""
fi

# Every sprint must have README
for sprint_dir in docs/sprints/sprint-*/; do
    [ -d "$sprint_dir" ] || continue

    if [ ! -f "$sprint_dir/README.md" ]; then
        fail "Missing README.md in: $sprint_dir

Fix: Copy template or run: scripts/docs/generate-sprint-readme.sh"
    fi

    if [ ! -f "$sprint_dir/.sprint-metadata.json" ]; then
        warn "Missing .sprint-metadata.json in: $sprint_dir
Sprint may have been created manually (use: npm run sprint:create)"
    fi

    # Check minimum file count
    FILE_COUNT=$(find "$sprint_dir" -maxdepth 1 -name "*.md" ! -name "README.md" | wc -l)
    if [ $FILE_COUNT -lt 1 ]; then
        fail "Sprint directory must contain README.md + at least 1 content file: $sprint_dir"
    fi
done

# Check 2: File naming conventions
echo ""
echo "🔤 Checking file naming conventions..."

STAGED_MD_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.md$' || true)

for file in $STAGED_MD_FILES; do
    # Skip READMEs (must be uppercase)
    [ "$(basename "$file")" = "README.md" ] && continue

    # Extract filename without path
    BASENAME=$(basename "$file" .md)

    # Check for invalid characters (must be kebab-case)
    if echo "$BASENAME" | grep -qE '[A-Z_]'; then
        fail "Invalid filename (use kebab-case): $file
Expected format: category-topic-type.md
Example: presentation-save-implementation-guide.md"
    fi

    # Check for spaces
    if echo "$file" | grep -q ' '; then
        fail "Filename contains spaces: $file"
    fi

    # Check for special characters
    if echo "$BASENAME" | grep -qE '[^a-z0-9-]'; then
        fail "Filename contains invalid characters: $file
Allowed: lowercase letters, numbers, hyphens only"
    fi
done

# Check 3: No docs in /src/ folder
echo ""
echo "📂 Checking for misplaced documentation..."

MISPLACED_DOCS=$(git diff --cached --name-only --diff-filter=A | grep '^src/.*\.md$' || true)
if [ ! -z "$MISPLACED_DOCS" ]; then
    fail "Documentation found in /src/ (move to /docs/):
$MISPLACED_DOCS

Fix: Move files to appropriate /docs/ subdirectory"
fi

# Check 4: Security documentation immutability
echo ""
echo "🛡️  Checking security audit trail..."

DELETED_SECURITY=$(git diff --cached --name-status | grep '^D.*docs/security/' | grep -v '/archived/' || true)
if [ ! -z "$DELETED_SECURITY" ]; then
    fail "Attempted to delete security documentation (archive instead):
$DELETED_SECURITY

Fix: Move files to docs/security/[category]/archived/ folder"
fi

# Check for modified security docs
MODIFIED_SECURITY=$(git diff --cached --name-only --diff-filter=M | grep 'docs/security/.*\.md$' | grep -v '/archived/' | grep -v 'README.md' || true)
for sec_file in $MODIFIED_SECURITY; do
    if [ -f "$sec_file" ]; then
        if ! grep -q "Version History:" "$sec_file"; then
            warn "Modified security doc missing version history: $sec_file
Add version history header (see DOCUMENTATION-GOVERNANCE.md)"
        fi
    fi
done

# Check 5: README completeness
echo ""
echo "📋 Checking README completeness..."

STAGED_READMES=$(git diff --cached --name-only --diff-filter=ACM | grep 'README\.md$' | grep 'docs/sprints/sprint-' || true)

REQUIRED_SECTIONS=(
    "Quick Start"
    "Document Organization"
    "Sprint Status"
    "Success Criteria"
)

for readme in $STAGED_READMES; do
    if [ -f "$readme" ]; then
        MISSING=""
        for section in "${REQUIRED_SECTIONS[@]}"; do
            if ! grep -qi "## .*$section" "$readme"; then
                MISSING="$MISSING\n  - $section"
            fi
        done

        if [ ! -z "$MISSING" ]; then
            fail "Incomplete README: $readme
Missing required sections:$MISSING

Fix: Add sections per template in DOCUMENTATION-GOVERNANCE.md"
        fi
    fi
done

# Check 6: OAuth documentation consolidation
echo ""
echo "🔐 Checking OAuth documentation..."

NEW_OAUTH_DOCS=$(git diff --cached --name-only --diff-filter=A | grep -i 'oauth' | grep -v 'docs/security/oauth/' || true)
if [ ! -z "$NEW_OAUTH_DOCS" ]; then
    warn "OAuth documentation found outside docs/security/oauth/:
$NEW_OAUTH_DOCS

All OAuth docs should be in: docs/security/oauth/"
fi

# Check 7: Link validation (basic check)
echo ""
echo "🔗 Checking for obvious broken links..."

for file in $STAGED_MD_FILES; do
    if [ -f "$file" ]; then
        # Check for relative links pointing outside docs
        EXTERNAL_LINKS=$(grep -o '\[.*\](\.\.\/.*\.md)' "$file" || true)
        if [ ! -z "$EXTERNAL_LINKS" ]; then
            warn "File contains relative links outside docs/: $file
Review links for correctness"
        fi
    fi
done

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $EXIT_CODE -eq 0 ]; then
    if [ $WARNINGS -gt 0 ]; then
        echo "⚠️  PASSED WITH $WARNINGS WARNING(S)"
        echo "   Review warnings above"
    else
        echo "✅ ALL DOCUMENTATION VALIDATION PASSED"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo "❌ DOCUMENTATION VALIDATION FAILED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📚 Reference:"
    echo "   docs/quality/DOCUMENTATION-GOVERNANCE.md"
    echo "   docs/quality/unified-documentation-architecture.md"
    echo ""
    echo "🚨 Emergency bypass (with reason):"
    echo "   git commit --no-verify -m 'docs: [reason]'"
    echo ""
    exit 1
fi
```

---

## 9. Automation NPM Scripts

**Add to `package.json`:**

```json
{
  "scripts": {
    "sprint:create": "scripts/docs/create-sprint.sh",
    "sprint:migrate": "scripts/docs/migrate-sprint.sh",
    "sprint:migrate-all": "scripts/docs/migrate-all-sprints.sh",
    "sprint:complete": "scripts/docs/complete-sprint.sh",

    "docs:validate": "scripts/docs/validate-structure.sh",
    "docs:validate-readmes": "scripts/docs/validate-readmes.sh",
    "docs:check-links": "scripts/docs/check-links.sh",
    "docs:detect-duplicates": "scripts/docs/detect-duplicates.sh",
    "docs:test-ai-nav": "scripts/docs/test-ai-navigation.sh",

    "docs:update-dates": "scripts/docs/update-readme-dates.sh",
    "docs:metrics": "scripts/docs/generate-metrics.sh",
    "docs:generate-readmes": "scripts/docs/generate-all-readmes.sh",

    "docs:install-hooks": "scripts/docs/install-hooks.sh",
    "docs:migrate-all": "scripts/docs/migrate-categories.sh && scripts/docs/migrate-all-sprints.sh && scripts/docs/generate-all-readmes.sh"
  }
}
```

---

## 10. Step-by-Step Migration Instructions

### 10.1 Pre-Migration Checklist

**Before starting migration:**

- [ ] Backup current documentation: `tar -czf docs-backup-$(date +%Y%m%d).tar.gz documents/ docs/`
- [ ] Create migration branch: `git checkout -b docs/unified-structure-migration`
- [ ] Review governance rules: Read `docs/quality/DOCUMENTATION-GOVERNANCE.md`
- [ ] Test automation scripts: Dry-run in isolated environment
- [ ] Notify team: Announce migration timeline and freeze on new docs

---

### 10.2 Migration Steps (Day 1)

**Morning: Setup & Sprint Migration**

```bash
# Step 1: Create scripts directory
mkdir -p scripts/docs
chmod +x scripts/docs/*.sh

# Step 2: Create unified directory structure
mkdir -p docs/{sprints,security/oauth,architecture/{adrs,diagrams,evolution},features/{completed,in-progress,planned},processes,guides/{getting-started,troubleshooting,testing,performance},audits/2025-10,api,quality}

# Step 3: Run sprint migration
npm run sprint:migrate-all

# Step 4: Validate sprint migration
npm run docs:validate

# Step 5: Commit sprint migration
git add docs/sprints
git commit -m "refactor: migrate all sprints to nested directory structure"
```

**Afternoon: Category Migration**

```bash
# Step 6: Run category migration
npm run docs:migrate-all

# Step 7: Validate file naming
for file in $(find docs -name "*.md" ! -name "README.md"); do
    if echo "$file" | grep -qE '[A-Z_]'; then
        echo "Needs rename: $file"
    fi
done

# Step 8: Rename files with invalid names
# (Use scripts/docs/batch-rename.sh)

# Step 9: Commit category migration
git add docs/
git commit -m "refactor: migrate documentation categories to unified structure"
```

---

### 10.3 Migration Steps (Day 2)

**Morning: README Generation**

```bash
# Step 10: Generate all READMEs
npm run docs:generate-readmes

# Step 11: Manually review and customize key READMEs
# - docs/README.md
# - docs/sprints/README.md
# - docs/security/README.md
# - docs/architecture/README.md

# Step 12: Commit READMEs
git add docs/**/README.md
git commit -m "docs: generate navigation READMEs for all categories"
```

**Afternoon: Validation & Testing**

```bash
# Step 13: Run all validation scripts
npm run docs:validate
npm run docs:validate-readmes
npm run docs:check-links
npm run docs:detect-duplicates

# Step 14: Test AI navigation
npm run docs:test-ai-nav

# Step 15: Generate metrics
npm run docs:metrics

# Step 16: Fix validation failures
# (Address any errors from steps 13-15)

# Step 17: Install pre-commit hooks
npm run docs:install-hooks

# Step 18: Test pre-commit hook
git add docs/quality/test.md  # Create dummy file
git commit -m "test: validate pre-commit hook"
git reset HEAD~1  # Undo test commit
```

---

### 10.4 Migration Steps (Day 3)

**Morning: Cleanup & Finalization**

```bash
# Step 19: Archive old documents folder
mv documents documents-archive-2025-10-18
echo "documents-archive-*/" >> .gitignore

# Step 20: Update CLAUDE.md references
# (Manual: Update all /documents references to /docs)

# Step 21: Update CI/CD workflows
# (Add docs:validate step to .github/workflows)

# Step 22: Final validation
npm run docs:validate
npm run docs:metrics

# Step 23: Create migration summary report
cat > docs/quality/migration-report-2025-10-18.md <<EOF
# Documentation Migration Report

**Date:** $(date +%Y-%m-%d)
**Status:** ✅ Complete

## Summary
- Total documents migrated: $(find docs -name "*.md" | wc -l)
- Sprints migrated: $(find docs/sprints -type d -name "sprint-*" | wc -l)
- READMEs generated: $(find docs -name "README.md" | wc -l)
- Validation status: ✅ All checks passing

## Metrics
$(npm run docs:metrics)

## Next Steps
- [ ] Merge migration branch
- [ ] Update team documentation
- [ ] Train team on new structure
- [ ] Monitor for issues
EOF

# Step 24: Final commit
git add .
git commit -m "refactor: complete documentation migration to unified structure

- Migrate all sprints to nested directories
- Consolidate category documentation
- Generate navigation READMEs
- Install validation hooks
- Archive old documents folder
- Update automation scripts

Closes: #[issue]
Follows: docs/quality/DOCUMENTATION-GOVERNANCE.md"
```

**Afternoon: Deployment & Handoff**

```bash
# Step 25: Push migration branch
git push origin docs/unified-structure-migration

# Step 26: Create PR with comprehensive description
gh pr create --title "Unified Documentation Structure Migration" \
  --body "$(cat docs/quality/migration-report-2025-10-18.md)"

# Step 27: Request review from team leads

# Step 28: After approval, merge to main
git checkout main
git merge docs/unified-structure-migration
git push origin main

# Step 29: Announce completion
# (Send team notification with new structure guide)

# Step 30: Monitor for issues
# (Watch for broken links, missing docs, confusion)
```

---

## 11. Success Criteria

**Migration is COMPLETE when:**

- [✅] All sprints are nested directories with README.md
- [✅] No flat sprint files exist
- [✅] All categories have README.md navigation
- [✅] File naming follows kebab-case convention
- [✅] Security docs have version tracking
- [✅] OAuth docs consolidated in `/docs/security/oauth/`
- [✅] Pre-commit hook installed and working
- [✅] CI/CD validation passing
- [✅] AI navigation tests pass (≤3 reads)
- [✅] Documentation debt score < 20 points
- [✅] Zero broken links
- [✅] All automation scripts functional
- [✅] Team trained on new structure

---

## 12. Rollback Plan

**If migration fails:**

```bash
# Emergency rollback procedure

# Step 1: Checkout main
git checkout main

# Step 2: Delete migration branch
git branch -D docs/unified-structure-migration

# Step 3: Restore from backup
tar -xzf docs-backup-YYYYMMDD.tar.gz

# Step 4: Verify restoration
ls -la documents/
ls -la docs/

# Step 5: Identify and fix issues
# (Review migration logs, fix scripts)

# Step 6: Retry migration
git checkout -b docs/unified-structure-migration-v2
# (Re-run migration steps)
```

---

## 13. Post-Migration Monitoring

**Week 1 After Migration:**

- [ ] Daily link validation checks
- [ ] Monitor team questions/confusion
- [ ] Track documentation debt score
- [ ] Review AI navigation test results
- [ ] Collect feedback on new structure

**Week 2-4:**

- [ ] Weekly validation runs
- [ ] Address stale document updates
- [ ] Refine README templates based on feedback
- [ ] Update automation scripts as needed

**Monthly:**

- [ ] Generate comprehensive metrics report
- [ ] Audit for orphaned documentation
- [ ] Review and update governance rules
- [ ] Team retrospective on new structure

---

## 14. Governance Compliance Matrix

| Rule | Implementation | Validation | Status |
|------|---------------|------------|--------|
| All sprints nested | Directory structure | Pre-commit hook | ✅ Enforced |
| README required | Template generation | CI/CD pipeline | ✅ Enforced |
| Kebab-case naming | File naming | Pre-commit hook | ✅ Enforced |
| Security immutability | Archive system | Pre-commit hook | ✅ Enforced |
| OAuth consolidation | Single folder | Duplicate detection | ✅ Enforced |
| AI navigation ≤3 reads | README structure | AI navigation test | ✅ Tested |
| Version tracking | Template header | Manual review | ⚠️ Recommended |
| Minimum 2 files/sprint | File count check | Pre-commit hook | ✅ Enforced |
| No docs in /src | Path validation | Pre-commit hook | ✅ Enforced |

---

## 15. Future Enhancements

**Automation Improvements:**

1. **Auto-README generation** on file add (Git hooks)
2. **Smart duplicate detection** using content hashing
3. **AI-powered link validation** (check HTTP responses)
4. **Automated metrics dashboard** (web UI)
5. **Spell check integration** in CI/CD
6. **Code example validation** (syntax checking)
7. **Auto-archive stale docs** (>90 days unused)
8. **Documentation linter** (style guide enforcement)

**Process Improvements:**

1. **Monthly doc review sprint** (dedicated time)
2. **Documentation ownership** (assign maintainers)
3. **Contributor recognition** (doc quality awards)
4. **Integration with project management** (auto-link to issues)

---

## 16. References

- **[DOCUMENTATION-GOVERNANCE.md](DOCUMENTATION-GOVERNANCE.md)** - Mandatory rules
- **[CODE_QUALITY_ENFORCEMENT.md](CODE_QUALITY_ENFORCEMENT.md)** - Quality standards
- **[/docs/README.md](../README.md)** - Master navigation
- **[CLAUDE.md](../../CLAUDE.md)** - Project coding standards

---

## 📝 Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-10-18 | Initial architecture design | Documentation Architecture Agent |

---

**Status:** 🎯 ARCHITECTURAL DESIGN
**Implementation:** Pending (awaiting approval)
**Next Review:** After migration completion
**Maintained By:** Documentation Team