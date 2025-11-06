# Simulator Removal Plan

**Created:** 2025-11-06  
**Target:** Complete removal of simulator functionality from codebase  
**Status:** Planning Phase

---

## THINK: Analysis & Impact Assessment

### Current State Discovery

**Simulator Components Identified:**

1. **`packages/simulator/`** - Main simulator package
   - CLI tool for testing extension auth flows
   - Commands: register, pair, save, status, clear
   - TypeScript implementation with dist build output
   - Package name: `@gamma-plugin/simulator`
   - Bin command: `simulator`

2. **`packages/web/simulator/`** - Alternative simulator implementation
   - Node.js simulator for testing auth and API flows
   - Similar functionality to main simulator
   - Package name: `gamma-extension-simulator`
   - Contains test utilities and examples

3. **`tools/extension-simulator/`** - Legacy location (mentioned in archived docs)
   - Appears to be empty or minimal
   - Referenced in Sprint-39 documentation

### Dependencies & References

**Code References:**
- ✅ **No active code imports** - Simulator packages are self-contained
- ✅ **No CI/CD integration** - Not referenced in build scripts or workflows
- ✅ **No test dependencies** - No test files import simulator code
- ✅ **No runtime dependencies** - Extension and web packages don't use simulator

**Documentation References:**
- `docs/architecture/codemaps/claude-code-codemap.md` - Mentions simulator in package table
- `PROJECT_STATE.md` - References Sprint-39 Extension Simulator
- `docs/archived/simulator-implementation-summary.md` - Full implementation docs
- `docs/archived/architecture/simulator-implementation-guide.md` - Architecture docs
- `docs/archived/architecture/simulator-architecture.md` - Design docs
- `docs/archived/roadmap/sprint-39-extension-simulator.md` - Sprint planning docs
- Multiple README and implementation docs in simulator directories

**Configuration References:**
- No references in `package.json` root scripts
- No references in `tsconfig.json` paths
- No references in `vite.config.js`
- No references in `netlify.toml`

### Impact Assessment

**Risk Level:** 🟢 **LOW**
- Simulator is completely isolated from production code
- No active dependencies from other packages
- Removal will not affect extension, web, or shared packages
- Only impact is documentation cleanup

**Files to Remove:** ~1100+ files (including dist builds and node_modules)

---

## PLAN: Removal Strategy

### Phase 1: Pre-Removal Validation ✅

**Objective:** Confirm simulator is truly unused

**Tasks:**
1. ✅ Verify no code imports simulator packages
2. ✅ Verify no build scripts reference simulator
3. ✅ Verify no CI/CD workflows use simulator
4. ✅ Verify no test files depend on simulator
5. ✅ Document all references found

**Status:** Complete - No active dependencies found

---

### Phase 2: Directory Removal 🎯

**Objective:** Remove all simulator directories and their contents

**Tasks:**

#### 2.1 Remove Main Simulator Package
```bash
# Remove entire packages/simulator/ directory
rm -rf packages/simulator/
```

**Contents:**
- Source code (`src/`)
- Build output (`dist/`)
- Configuration files (`package.json`, `tsconfig.json`)
- Documentation (`README.md`, `IMPLEMENTATION.md`)
- Data files (`data/storage.json`)
- Node modules (`node_modules/`)

#### 2.2 Remove Web Simulator Package
```bash
# Remove entire packages/web/simulator/ directory
rm -rf packages/web/simulator/
```

**Contents:**
- Source code (`src/`)
- Bin scripts (`bin/`)
- Documentation (multiple `.md` files)
- Examples (`examples/`)
- Test utilities (`test-save-direct.js`)
- Storage data (`.simulator-storage/`)
- Node modules (`node_modules/`)

#### 2.3 Remove Legacy Tools Directory (if exists)
```bash
# Remove tools/extension-simulator/ if it contains simulator code
rm -rf tools/extension-simulator/
```

**Note:** Verify contents first - may be empty or contain other tools

---

### Phase 3: Documentation Cleanup 📚

**Objective:** Remove or update all documentation references

**Tasks:**

#### 3.1 Update Active Documentation

**File: `docs/architecture/codemaps/claude-code-codemap.md`**
- **Action:** Remove simulator entry from package table (line 27)
- **Change:** Delete row: `| packages/simulator/ | Local testing tool - simulates extension environment for development |`

**File: `PROJECT_STATE.md`**
- **Action:** Update Sprint-39 reference
- **Change:** Update line 4 from "Sprint-39 Extension Simulator & Presentation Save Remediation ✅" to "Sprint-39 Presentation Save Remediation ✅"
- **Action:** Remove simulator-related bullet points from Sprint-39 section

#### 3.2 Archive Documentation (Optional)

**Files in `docs/archived/`:**
- `docs/archived/simulator-implementation-summary.md` - Keep (already archived)
- `docs/archived/architecture/simulator-implementation-guide.md` - Keep (already archived)
- `docs/archived/architecture/simulator-architecture.md` - Keep (already archived)
- `docs/archived/roadmap/sprint-39-extension-simulator.md` - Keep (already archived)

**Decision:** Keep archived docs for historical reference - they're already in archived folder

---

### Phase 4: Verification & Testing ✅

**Objective:** Ensure removal didn't break anything

**Tasks:**

#### 4.1 Build Verification
```bash
# Verify extension builds
npm run build:extension

# Verify web builds
npm run build:web

# Verify shared builds
npm run build:shared

# Verify full build
npm run build:all
```

#### 4.2 Type Check
```bash
npm run type-check
```

#### 4.3 Lint Check
```bash
npm run lint
```

#### 4.4 Test Suite
```bash
npm run test:run
```

#### 4.5 Search for Remaining References
```bash
# Search for any remaining simulator references
grep -r "simulator" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" .
```

**Expected:** Only matches in archived documentation (acceptable)

---

### Phase 5: Git Cleanup 🗂️

**Objective:** Clean up git history and ensure clean state

**Tasks:**

#### 5.1 Stage Removal
```bash
git add -A
git status  # Verify changes
```

#### 5.2 Commit Removal
```bash
git commit -m "chore: remove simulator packages and functionality

- Remove packages/simulator/ (main simulator CLI)
- Remove packages/web/simulator/ (web simulator implementation)
- Remove tools/extension-simulator/ (legacy location)
- Update documentation references in codemap and PROJECT_STATE.md
- Simulator was unused and not integrated into build/test workflows

BREAKING CHANGE: Simulator functionality completely removed"
```

---

## ACT: Execution Checklist

### Pre-Execution
- [ ] Review this plan with team/stakeholders
- [ ] Backup current state: `git branch backup/pre-simulator-removal`
- [ ] Verify no active work depends on simulator

### Execution Steps
- [ ] **Phase 2.1:** Remove `packages/simulator/`
- [ ] **Phase 2.2:** Remove `packages/web/simulator/`
- [ ] **Phase 2.3:** Remove `tools/extension-simulator/` (if applicable)
- [ ] **Phase 3.1:** Update `docs/architecture/codemaps/claude-code-codemap.md`
- [ ] **Phase 3.1:** Update `PROJECT_STATE.md`
- [ ] **Phase 4.1:** Run build verification
- [ ] **Phase 4.2:** Run type check
- [ ] **Phase 4.3:** Run lint check
- [ ] **Phase 4.4:** Run test suite
- [ ] **Phase 4.5:** Search for remaining references
- [ ] **Phase 5.1:** Stage changes in git
- [ ] **Phase 5.2:** Commit removal

### Post-Execution
- [ ] Verify git status is clean
- [ ] Update any team documentation/wiki
- [ ] Notify team of removal (if applicable)

---

## Rollback Plan

If removal causes issues:

```bash
# Restore from backup branch
git checkout backup/pre-simulator-removal
git branch -D backup/pre-simulator-removal  # After verification
```

---

## Estimated Impact

**Files Removed:** ~1100+ files  
**Disk Space Freed:** ~50-100 MB (estimated)  
**Build Time Impact:** None (simulator not in build chain)  
**Test Impact:** None (simulator not in test suite)  
**Documentation Impact:** 2 active files updated, archived docs preserved

---

## Notes

- Simulator was created during Sprint-39 for testing extension auth flows
- Never integrated into CI/CD or build processes
- Completely isolated from production code
- Safe to remove without impact on extension, web, or shared packages
- Archived documentation preserved for historical reference

---

**Next Steps:** Review plan → Create backup branch → Execute removal → Verify → Commit

