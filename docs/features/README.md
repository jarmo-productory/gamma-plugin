# Features Documentation

**Status:** ✅ Active
**Last Updated:** 2025-10-19

---

## 🎯 Quick Start (for AI agents)

**Looking for feature information?**

1. **Planned Features** → [/docs/features/planned/](/docs/features/planned/)
2. **In Progress** → [/docs/features/in-progress/](/docs/features/in-progress/)
3. **Completed** → [/docs/features/completed/](/docs/features/completed/)

---

## 📁 Features Structure

```
features/
├── README.md                    # This file
├── planned/                     # Planned features (PRDs, specs)
│   ├── README.md
│   └── [feature-name].md
├── in-progress/                 # Active development
│   ├── README.md
│   └── [feature-name]/         # Nested if complex
└── completed/                   # Completed features
    ├── README.md
    └── [feature-name].md
```

---

## 📚 Document Organization

### Planned Features
**Purpose:** Feature specifications before implementation starts

**Required Content:**
- Problem statement
- User stories
- Acceptance criteria
- Technical requirements
- Mockups/wireframes (if applicable)

### In Progress
**Purpose:** Active feature development tracking

**Required Content:**
- Implementation status
- Architecture decisions
- Open questions
- Blockers/dependencies

### Completed
**Purpose:** Historical record of shipped features

**Required Content:**
- Final implementation summary
- What was delivered
- Known limitations
- Future improvements

---

## 🚀 Feature Lifecycle

```
1. PLANNED → Create spec in /planned/
2. START → Move to /in-progress/ (or create nested folder if complex)
3. IMPLEMENT → Update docs during development
4. COMPLETE → Move to /completed/ with final summary
5. ARCHIVE → Old completed features → /docs/archived/features/
```

---

## 📋 Feature Document Template

**File naming:** `[feature-name]-spec.md` or `[feature-name]-prd.md`

**Required sections:**
```markdown
# [Feature Name]

**Status:** [Planned | In Progress | Completed]
**Priority:** [High | Medium | Low]
**Start Date:** YYYY-MM-DD
**Target Date:** YYYY-MM-DD

## Problem Statement
[What problem does this solve?]

## User Stories
- As a [user type], I want [goal] so that [benefit]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Requirements
[Technical considerations]

## Dependencies
[Related features, sprints, or systems]

## Success Metrics
[How do we measure success?]
```

---

## 🎯 Success Criteria

**Feature documentation is complete when:**
- [ ] Problem clearly defined
- [ ] User stories documented
- [ ] Acceptance criteria listed
- [ ] Technical requirements specified
- [ ] Dependencies identified
- [ ] Success metrics defined

---

## 🔗 Related Documentation

- [Sprints](/docs/sprints/) - Sprint planning that implements features
- [Architecture](/docs/architecture/) - Technical architecture
- [Documentation Governance](/docs/quality/DOCUMENTATION-GOVERNANCE.md)

---

**Maintained by:** Product & Development Teams
**Review Cycle:** Per feature lifecycle
**Next Review:** Ongoing
