# Sprints Directory

**Status:** ✅ Active
**Last Updated:** 2025-10-19

---

## 🎯 Quick Start (for AI agents)

**Looking for sprint information?**

1. **Latest Sprint:** Check highest numbered `sprint-XX/` folder
2. **Sprint Planning:** Each sprint folder has README.md with navigation
3. **Sprint History:** All sprints archived here in chronological order

---

## 📋 Sprint Structure Rules

**MANDATORY:** All sprints MUST be nested directories (flat files FORBIDDEN)

### Correct Structure:
```
sprints/
├── sprint-01/
│   ├── README.md                    # MANDATORY navigation guide
│   ├── foundation-setup-plan.md     # Sprint planning document
│   └── completion-report.md         # Sprint retrospective
├── sprint-02/
│   ├── README.md
│   └── ...
```

### ❌ WRONG - Flat Files (Forbidden):
```
sprints/
├── sprint-01-foundation.md         # WRONG - must be in sprint-01/ folder
├── sprint-02.md                     # WRONG - must be in sprint-02/ folder
```

---

## 🚀 Creating New Sprints

**REQUIRED:** Use automation script only (manual creation blocked by pre-commit hooks)

```bash
# Create new sprint
npm run sprint:create <number> "<name>"

# Example:
npm run sprint:create 40 "Performance Optimization"

# This auto-generates:
# - sprints/sprint-40/ directory
# - sprints/sprint-40/README.md (from template)
# - sprints/sprint-40/.sprint-metadata.json (tracking)
# - sprints/sprint-40/performance-optimization-plan.md (empty template)
```

---

## 📊 Sprint Lifecycle Phases

### Phase 1: Planning
**Required Documents:**
- `README.md` - Sprint navigation
- `[name]-plan.md` - Goals, scope, acceptance criteria

### Phase 2: Implementation
**Additional Documents:**
- `implementation-architecture.md` (if complex)
- `task-breakdown.md` (if >10 tasks)
- `dependency-analysis.md` (if new dependencies)

### Phase 3: Completion
**Final Documents:**
- `completion-report.md` OR `postmortem.md`
- `LEARNINGS.md` - What worked, what didn't

---

## 🔍 Active Sprints

**Current Sprints:**
- Check folders below for active sprint work

**To find current sprint:**
```bash
# List all sprints
ls -la docs/sprints/

# Find latest sprint
ls -la docs/sprints/ | grep sprint- | tail -1
```

---

## 📚 Sprint Archive

**Historical Sprints:** All past sprints remain in this directory for reference.

**Deprecated Sprints:** Moved to `/docs/archived/roadmap/` if no longer relevant.

---

## 🎯 Sprint Quality Standards

**Every sprint MUST have:**
- ✅ Nested directory structure (sprint-XX/)
- ✅ README.md with required sections
- ✅ `.sprint-metadata.json` tracking file
- ✅ At least one content document
- ✅ Completion documentation when done

**Validation:**
- Pre-commit hook checks sprint structure
- CI/CD validates README completeness
- AI navigation test ensures ≤3 file read access

---

## 🔗 Related Documentation

- [Documentation Governance](/docs/quality/DOCUMENTATION-GOVERNANCE.md) - Sprint structure rules
- [Roadmap Archive](/docs/archived/roadmap/) - Historical sprint planning

---

**Enforcement:** MANDATORY
**Validation:** Automated (pre-commit + CI/CD)
**Exception Process:** Requires 2+ maintainer approval
