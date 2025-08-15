# Team Process & Standards

## 🚨 CRITICAL LESSON LEARNED: Discovery Before Planning

After Sprint 3 planning failure where the team planned fictional infrastructure instead of using existing resources, we have established mandatory Discovery-First process for all agents.

## Discovery-First Mandate

### The Failure That Led to This Process
- **Sprint 3 Planning Failure**: All 5 agents planned to create new infrastructure
- **Reality**: Netlify site, GitHub integration, and Supabase database already existed
- **Root Cause**: No agent conducted AS IS assessment before planning
- **Impact**: Wasted planning time, fictional requirements, overengineered solutions

### New Mandatory Process

#### Phase 0: DISCOVERY (MANDATORY FIRST)

**Every agent MUST inventory their domain BEFORE any planning:**

1. **Tech Lead Discovery Requirements:**
   - Read all existing architecture documentation
   - Analyze code patterns with `grep` and `glob`
   - Review technical decisions in memory files
   - Document existing technical state vs assumptions

2. **DevOps Discovery Requirements:**
   - Run `netlify status` to check deployments
   - Run `supabase projects list` for database inventory
   - Run `gh repo view` for GitHub integration status
   - Check CI/CD pipelines and existing automation
   - Document ALL infrastructure before proposing changes

3. **Full-Stack Discovery Requirements:**
   - Read existing code implementations
   - Find API endpoints with `grep`
   - Check database schema with migration files
   - Map existing functionality before proposing new

4. **QA Discovery Requirements:**
   - Check existing test files and coverage
   - Run existing tests to establish baseline
   - Review previous quality metrics
   - Document current testing infrastructure

5. **UX/UI Discovery Requirements:**
   - Review existing UI components and patterns
   - Check current styling implementations
   - Document existing user flows
   - Identify established design system elements

### Discovery Validation Checklist

Before ANY agent provides recommendations, they must answer:
- [ ] What already exists in my domain?
- [ ] What CLI commands did I run to verify?
- [ ] What files did I read to understand current state?
- [ ] What assumptions was I about to make that are false?
- [ ] What would I have built that already exists?

### Team Lead Validation Requirements

As Team Lead, I MUST:
1. **Reject any planning without discovery evidence**
2. **Require CLI command outputs as proof of assessment**
3. **Validate discovered state matches agent understanding**
4. **Document AS IS state before approving TO BE plans**

## Sprint Planning Process (Updated)

### Phase 1: Discovery (NEW MANDATORY)
- All agents conduct domain inventory
- Document existing state with evidence
- Share discovered reality with team
- Identify gaps between assumptions and reality

### Phase 2: Planning (Based on Discovery)
- Plan only what doesn't exist
- Build on discovered foundation
- Reference existing infrastructure
- Avoid reinventing existing solutions

### Phase 3: Design
- Extend existing patterns
- Maintain discovered consistency
- Leverage existing infrastructure

### Phase 4: Implementation
- Build on discovered code
- Use existing APIs and patterns
- Extend rather than replace

### Phase 5: Testing
- Test against existing baselines
- Validate no regressions
- Build on existing test infrastructure

## Memory System Updates

### New Memory Structure Requirements

All agent memory files must include:
```markdown
## 📊 Current State Inventory (AS IS)
- **Infrastructure**: [What exists]
- **Code**: [What's implemented]
- **Patterns**: [What's established]
- **Last Verified**: [Date and method]

## 📝 Decisions & Changes (TO BE)
- **New Additions**: [What we're adding]
- **Modifications**: [What we're changing]
- **Rationale**: [Why these changes]
```

## Evidence-Based Planning

### Required Evidence Types

1. **CLI Command Outputs**
   ```bash
   netlify status        # For deployment state
   supabase projects list # For database state
   gh repo view          # For repository state
   npm ls               # For dependencies
   ```

2. **File System Evidence**
   ```bash
   ls -la               # Directory contents
   grep -r "pattern"    # Code patterns
   find . -name "*.ts"  # File inventory
   ```

3. **Configuration Evidence**
   - .env files
   - Config files
   - Package.json
   - Deployment configs

## Success Metrics

### Good Discovery Indicators
- ✅ Agent references existing infrastructure by name
- ✅ Agent provides CLI output as evidence
- ✅ Agent identifies what NOT to build
- ✅ Agent builds on existing patterns

### Planning Failure Indicators
- ❌ Agent proposes creating what exists
- ❌ Agent makes assumptions without verification
- ❌ Agent plans in vacuum without context
- ❌ Agent ignores available CLI tools

## Continuous Improvement

This process will be refined based on retrospectives. The core principle remains:

**"Discovery Before Planning - Always"**

No exceptions. No assumptions. Evidence-based planning only.

---

*Created: 2025-08-15*  
*Reason: Sprint 3 planning failure - team planned fictional infrastructure*  
*Lesson: Without AS IS assessment, all planning becomes fiction*