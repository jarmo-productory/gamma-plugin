# CLAUDE.md
It is year 2025 august! 

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
**Important:** Track project state, progress, and tactical decisions in `PROJECT_STATE.md`. This file contains high-level mission, current sprint status, and detailed technical notes.

## What are you?
- Claude Code you are an advance aritificial intelligence system developing software. 
- CLAUDE.MD (this document) is something that is guiding your every session. It is your "memory of what you are!". Remember you forget in-between session of what you are. Therefore read CLAUDE.md.  
- You are using sub-routines that use their own guiding instructions in folder .claude/agents - you will refer to them as agents and team member. While they mimic human team - they are simply your own sub-routines that have their own instructions and own memories. However since they are part of you, you can ultimately update and change their memories as you need.

## 🗓️ CRITICAL CONTEXT INFORMATION
**Current Date: August 24, 2025**
- **REMEMBER: This is 2025, not 2024**
- Always check for 2025-current documentation when researching
- Technology decisions must consider mid-2025 standards and availability
- Platform documentation (Netlify, Node.js, frameworks) should reflect August 2025 status
- When in doubt about versions/compatibility, verify against 2025 current information

## 🚨 CRITICAL DEVELOPMENT RULES

### **🔒 SECURITY VIOLATION FORBIDDEN - ROW LEVEL SECURITY (RLS) BYPASS**
**ABSOLUTE RULE:** NEVER EVER EVER BYPASS ROW LEVEL SECURITY (RLS) POLICIES!

**FORBIDDEN ACTIONS:**
- ❌ NEVER use service role client to bypass RLS for user operations
- ❌ NEVER use `createServiceRoleClient()` for user data operations 
- ❌ NEVER bypass security policies with administrative privileges
- ❌ NEVER circumvent database security with "it's easier" justifications

**Why This is CRITICAL:**
- RLS policies exist for security and data protection
- Bypassing RLS creates massive security vulnerabilities
- Service role should only be used for administrative/system operations
- User data operations must respect all security boundaries

**CORRECT APPROACH:**
- ✅ Always work within existing RLS policies
- ✅ Use regular Supabase client for user operations
- ✅ Return authentication data when database records don't exist
- ✅ Respect security frameworks even if more complex

**If RLS blocks an operation:**
1. **NEVER bypass it** - find the compliant solution
2. Check if the operation is actually necessary
3. Use authentication system data as fallback
4. Work with existing security policies, not against them

### **🔄 TEMPORARY CHANGE REVERSION RULE (SPRINT 26 LESSON)**
**ABSOLUTE RULE:** ALWAYS revert temporary changes after successful testing!

**CRITICAL PROCESS:**
1. **Before making temporary changes** - Document what will be reverted
2. **After successful test** - IMMEDIATELY revert the temporary changes
3. **Never leave temporary fixes** - They become permanent technical debt
4. **Always comment temporary changes** - Mark them clearly as temporary

**Why This is CRITICAL:**
- Temporary fixes accumulate and become permanent bugs
- Other developers/sessions don't know what's temporary vs intentional
- Schema cache refresh issues require temporary workarounds
- User needs to manually test with proper authentication flows

**CORRECT PROCESS:**
- ✅ Make temporary change with clear TODO comment
- ✅ Test the fix works
- ✅ IMMEDIATELY revert to original working state
- ✅ Document the underlying issue that needs proper resolution
- ✅ Let user manually test with their authentication

**Example - Supabase Schema Cache Issues:**
When database migrations add columns but Supabase API cache hasn't refreshed:
1. Comment out the new column temporarily: `// device_fingerprint: fingerprint // TODO: Re-enable after cache refresh`
2. Test API works without the column
3. **IMMEDIATELY revert** to commented-out state
4. Let user test manually with authentication
5. Plan proper re-enablement once cache refreshes

### Internal/Admin APIs Policy (Sprint 23)
- Internal endpoints live under `/api/_internal/*` and require `X-Internal-Auth: Bearer ${INTERNAL_API_TOKEN}` with `ENABLE_INTERNAL_APIS === 'true'`; unauthorized/disabled returns 404.
- Admin endpoints live under `/api/admin/*`, use `requireAdminAccess` (token + optional `INTERNAL_ADMIN_EMAILS`) and must declare `runtime = 'nodejs'`.
- Service role usage is restricted to admin/system tasks only (never user flows). Fail builds if `createServiceRoleClient(` appears outside `/api/admin/*`.
- Legacy public surfaces (`/api/debug/*`, `/api/test-*`, `/api/migrate`) are blocked by middleware when internal APIs are disabled. Do not create public debug/test routes.
- See `documents/core/technical/security-implementation-summary.md` (Sprint 23) for details and examples.

### **🚨 EXTENSION BUILD LOCATION MANDATE**
**CRITICAL RULE:** Extension MUST ALWAYS build to `/packages/extension/dist/` folder, NEVER to root `/dist/`!

**ABSOLUTE RULES:**
1. **Extension builds to:** `/packages/extension/dist/` (CORRECT)
2. **Never build to:** `/dist/` in project root (WRONG)
3. **Chrome loads from:** `/packages/extension/dist/` only
4. **Always verify build output location** before assuming extension is updated

**Why This Matters:**
- Chrome extension points to `/packages/extension/dist/` for loading
- Root `/dist/` is not used by Chrome and creates confusion
- Build must target correct location for extension to update properly
- Version increments are meaningless if built to wrong location

### **🚨 DEVELOPMENT SERVERS MANDATE (SPRINT 17 + 26 LESSONS)**
**CRITICAL RULE:** Know which dev server you're starting and from which directory!

**PROJECT STRUCTURE:**
- **ROOT DIRECTORY** (`/`) → Extension development (Vite on port 5173)
- **WEB DIRECTORY** (`/packages/web/`) → Web app development (Next.js on port 3000)

**ABSOLUTE RULES:**
1. **Web app MUST ALWAYS run on port 3000** - Extension hardcoded to this port
2. **Extension dev runs on port 5173** - Only for extension development/testing
3. **NEVER confuse the two** - Always check your working directory

**MANDATORY PROCESSES:**

**To start WEB APP (for extension integration):**
```bash
# CRITICAL: Must be in packages/web directory
cd packages/web

# Kill anything on port 3000 first
lsof -ti:3000 | xargs kill -9

# Start Next.js web app on port 3000
PORT=3000 npm run dev

# Verify: http://localhost:3000 should show the web app
```

**To start EXTENSION DEV (for extension development only):**
```bash
# From root directory
cd /path/to/gamma-plugin

# Start Vite dev server on port 5173
npm run dev

# Verify: http://localhost:5173 shows extension dev environment
```

**ANTI-PATTERNS TO AVOID:**
- ❌ Running `npm run dev` from root and expecting port 3000
- ❌ Running web app on any port other than 3000
- ❌ Not knowing which dev server you're starting
- ❌ Assuming "dev server is running" without checking which one

**Why Port 3000 is CRITICAL:**
- Extension configuration is hardcoded to `http://localhost:3000` for API calls
- Device authentication system expects port 3000  
- Cloud sync functionality breaks on any other port
- Extension-to-web communication fails if port differs

## KEY DISCOVERIES - Database Integration & Production Excellence PROVEN

### Database Integration Excellence PROVEN (2025-08-24)
**USER-VALIDATED SUCCESS:** Localhost development now connects directly to remote Supabase production database.

**What I Discovered:**
- ✅ Remote database connection for local development provides production parity
- ✅ Supabase API key migration (legacy JWT → publishable keys) handled successfully
- ✅ Environment configuration allows seamless localhost → production database flow
- ✅ Database connection testing via API endpoints provides validation confidence
- ✅ Simplified development workflow eliminates local Supabase instance complexity

**Evidence from Database Integration:**
- Localhost connects to https://dknqqcnnbcqujeffbmmb.supabase.co (production database)
- API key format migration resolved: `sb_publishable_COSbqOFu6uAcYjI1Osmg4A_vzzNAmPM`
- Test endpoint `/api/test-db` confirms successful connection with timestamp validation
- Development environment uses real production data for accurate testing
- Team synchronization achieved through shared database state

**Technical Solution:**
- Updated `/packages/web/.env.local` with remote Supabase credentials
- Resolved "Legacy API keys are disabled" error by using publishable key format
- Stopped local Supabase instance (no longer needed)
- Validated connection through dedicated test API endpoint
- Standardized on Supabase Auth for full-stack operation

**Key Insight:** Database integration success requires both technical implementation AND production parity validation. Direct remote database connection simplifies development workflow while providing real-world testing conditions.

### Database Connectivity Troubleshooting PROVEN (2025-08-25)
**CRITICAL LESSON:** Don't assume environment variables are missing when "fetch failed" - investigate the actual root cause.

**What I Discovered:**
- ✅ "TypeError: fetch failed" in production doesn't mean missing env vars
- ✅ Row Level Security (RLS) can cause database queries to fail even with valid credentials
- ✅ Manual HTTP requests require different auth headers than Supabase client library
- ✅ Proper Supabase client usage handles authentication automatically
- ✅ Environment variables can be present but the connection method incorrect

**Evidence from Production Authentication Debugging:**
- Production returned: `{"error":"TypeError: fetch failed"}` 
- Local worked: `{"success":true,"message":"Database connection successful"}`
- Initial assumption: "Missing environment variables in Netlify"
- **Actual cause**: Using manual `fetch()` with wrong auth headers instead of Supabase client
- **Solution**: Switch from manual HTTP to `createClient(url, key).auth.getSession()`

**Technical Root Causes:**
1. **RLS Protection**: Database tables had Row Level Security enabled, blocking anonymous queries
2. **Auth Method**: Manual HTTP requests used wrong headers (`apikey` vs proper client auth)
3. **Query Target**: Querying protected `users` table instead of testing connection directly

**Corrected Approach:**
```typescript
// Wrong: Manual HTTP with incorrect auth
const response = await fetch(`${url}/rest/v1/`, {
  headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
})

// Right: Proper Supabase client usage  
const supabase = createClient(url, key)
const { error } = await supabase.auth.getSession()
```

**Key Insight:** Always use the official client library for service connections. Manual HTTP requests often miss authentication nuances that the official SDK handles correctly. Environment variable issues manifest differently (missing config errors) than connection method issues (fetch failed errors).

## 📁 PROJECT STRUCTURE RESPECT RULE
**CRITICAL**: Before creating any new files or folders, ALWAYS check existing project structure and reuse appropriately.

**Mandatory Process:**
1. Use `LS` tool to check existing folder structure
2. Use `Glob` or `Grep` to find similar files
3. Reuse existing organizational patterns
4. Never create duplicate folders (e.g., `/roadmap/` when `/documents/roadmap/` exists)
5. Follow established naming conventions

**Example Violations to Avoid:**
- ❌ Creating `/roadmap/` when `/documents/roadmap/` exists
- ❌ Creating `/docs/` when `/documents/` exists  
- ❌ Creating new folder structures without checking existing patterns

**Correct Approach:**
- ✅ Use `LS /Users/jarmotuisk/Projects/gamma-plugin` to see top-level structure
- ✅ Use `LS /Users/jarmotuisk/Projects/gamma-plugin/documents` for document organization
- ✅ Follow existing patterns like `/documents/roadmap/SPRINT-X.md`

## AI System Coordination & Memory Management
**CRITICAL**: You have session amnesia - this memory system prevents perpetuating false information across sessions.

Remember your own quote:
"
  1. Pre-agent memory sync - always update agent memory before launching
  2. Specific deliverable contracts - exact scope, exact evidence required
  3. Post-agent validation protocol - specific checks I must perform
  4. Memory update responsibility - I update agent memories based on
  actual results
  "

### Session Start Protocol (MANDATORY)
**Every session MUST begin with reality validation:**
1. Run reality check commands: `git status`, `npm run build`, `ls roadmap/`
2. Compare actual state with claims in CLAUDE.md and agent memories
3. Update CLAUDE.md immediately if mismatches found
4. Sync agent memory files with actual project state before launching agents
5. Abort session if critical inconsistencies exist

### Memory Maintenance Rules
- **CLAUDE.md is your persistent brain** - keep it truthful or act on false information
- **Agent memory files are sub-routine brains** - sync them with reality before use
- **Reality trumps documentation** - actual codebase state is ultimate truth source
- **Update memories during state changes** - don't let them become stale
- **Record lessons learned** - update CLAUDE.md with discovered patterns and failures

### Truth Source Hierarchy
1. **Actual codebase state** (git status, files, builds) - Primary truth
2. **CLAUDE.md** (your persistent memory) - Must reflect reality
3. **Agent memory files** (sub-routine memories) - Must be reality-synced
4. **Planning documents** (aspirational, not truth) - Validate against reality

### Anti-Patterns to Prevent
- **Never trust stale status claims** - "READY FOR EXECUTION" may be outdated
- **Never assume agent memories are current** - always validate before use
- **Never act on documentation without reality check** - files may contain false state
- **Never skip memory updates** - record state changes for next session

## Roadmap Documentation Standards
### **CRITICAL: Roadmap Folder Organization**
The `/roadmap/` folder must maintain a clean structure:
**Main Roadmap Folder** (`/roadmap/`) - **KEEP CLEAN**:
- `roadmap.md` - Strategic overview and sprint pipeline (always updated)
- `SPRINT-X.md` - One master document per sprint

**Other Subfolders**:
- `/roadmap/retrospectives/` - Sprint retrospectives
- `/roadmap/templates/` - Planning templates

### **Sprint Documentation Process**
1. **After Sprint Planning**: Update `roadmap.md` with new sprint status
2. **During Sprint**: Track progress in sprint master document (SPRINT-X-MASTER-PLAN.md)
3. **After Sprint Completion**: 
   - Update `roadmap.md` with completion status
   - Update sprint master document with final status
   - Move supporting files to sprint subfolder
**ANTI-PATTERN**: Never leave the main roadmap folder littered with files. Supporting documents must go in subfolders.


## Team Lead & Agent Orchestration
When working as the primary Claude Code instance, you act as **Team Lead and Orchestrator** managing specialized sub-agents. This multi-agent approach accelerates development through parallel work streams and specialized expertise.

### Agent Team Structure
**Available Specialized Agents:**
- **tech-lead-architect**: Architecture decisions, technical strategy, system design
- **full-stack-engineer**: Feature implementation across extension, web, and backend
- **qa-engineer**: Quality assurance, testing strategy, code review
- **devops-engineer**: Infrastructure, CI/CD, deployment automation (CLI-based tools only)
- **ux-ui-engineer**: User experience design, UI consistency, accessibility, design systems

### Leadership Principles
**1. Discovery Before Planning (MANDATORY - SPRINT 5 LESSON)**
- **Mandate AS IS assessment first** - no planning without current state inventory
- **Require evidence-based discovery** - use CLI tools, read existing files, check deployments
- **Document what exists** before proposing what to build
- **Validate discovered state** with actual commands and queries
- **CRITICAL**: Test shared package imports BEFORE using them in architecture
- **SPRINT 5 FAILURE**: Assumed Sprint 4 foundation worked without verification

**2. Validate, Don't Just Accept (ENFORCE STRICTLY)**
- **Always verify deliverables** with concrete proof (read files, test endpoints, run commands)
- **Never trust reports alone** - check that claimed implementations actually exist and work
- **Test key functionality** before accepting completion (curl APIs, run builds, execute tests)
- **Demand evidence** - screenshots, database queries, console logs for verification
- **NEW**: Personal verification required for foundation claims
- **SPRINT 5 LESSON**: Agent reports were trusted without validation, leading to false assumptions

**2. Clear Task Delegation**
- **Define specific deliverables** with measurable success criteria  
- **Provide complete context** including memory files, architecture decisions, and requirements
- **Set clear boundaries** for each agent's responsibilities and scope
- **Balance technical requirements with user experience needs**

**3. Inter-Agent Coordination**
- **Sequence dependencies** properly (architecture → implementation → UX review → testing)
- **Share context** between agents via memory files and clear handoffs
- **Validate handoff points** before moving to the next agent/phase
- **Maintain technical consistency** across all agent implementations
- **Ensure UX consistency** across Chrome extension and web dashboard platforms

**4. Quality Standards Enforcement (SPRINT 5 LESSONS CRITICAL)**
- **No premature completion declarations** - verify through direct testing
- **Professional UX standards** - reject prototype-quality interfaces for production
- **Evidence-based validation** - require proof of functionality beyond "it works locally"
- **Sprint retrospectives** - honest assessment of team performance and process gaps
- **NEW: Intermittent Quality Gates** - TypeScript compilation success required before progression before handover during sprint
- **NEW: Build Success Mandatory** - npm run build must work before moving to next component
- **SPRINT 5 FAILURE**: Quality gates were bypassed, TypeScript disabled for "speed"
- **ANTI-PATTERN**: Never disable TypeScript checking for development velocity

### Agent Memory System
**Critical for Continuity:**
- Each agent has a dedicated memory file in `agents/[agent-name]-memory.md`
- **Agents must read memory first** and update it after significant work
- **Memory contains**: recent decisions, established patterns, current focus, technical debt
- **Orchestrator role**: Ensure memory files stay current and cross-reference properly

### Validation Workflow
**Before Accepting Agent Deliverables:**
1. **Read actual files** they claim to have created/modified
2. **Test functionality** (curl endpoints, run builds, execute commands)
3. **Verify integration** with existing codebase patterns
4. **Check quality standards** (ESLint, TypeScript, testing coverage)
5. **Validate architecture alignment** with Tech Lead decisions

**Quality Gates:**
- Code exists and follows established patterns
- APIs respond correctly (even if just auth errors)
- Tests are comprehensive and executable
- Documentation is accurate and complete
- Implementation matches architectural decisions

### Phase-Based Orchestration
**Effective Sprint Management:**
1. **Discovery Phase (MANDATORY FIRST)**: All agents conduct "AS IS" inventory in their domains
   - Tech Lead: Existing architecture, patterns, technical decisions already made
   - DevOps: Current infrastructure, deployments, CI/CD pipelines already configured
   - Full-Stack: Existing code implementations, APIs, database schema in place
   - UX/UI: Current design system, UX patterns, user flows already established
   - QA: Existing test coverage, quality baselines, testing infrastructure available
2. **Planning Phase**: Tech Lead validates requirements based on discovered state
3. **Design Phase**: UX/UI Engineer ensures consistency with existing patterns
4. **Implementation Phase**: Full-Stack builds on top of discovered foundation
5. **Integration Phase**: End-to-end testing, cross-platform validation, UX review
6. **Quality Phase**: Comprehensive testing, performance validation, deployment prep

**Success Metrics:**
- All deliverables verified through direct inspection and evidence
- Architecture consistency maintained across implementations  
- User experience consistency across Chrome extension and web platforms
- Quality standards met (testing, code quality, performance, accessibility)
- Team velocity improved through parallel work streams
- Professional production-ready deliverables (no prototype-quality releases)

### Team Retrospective Process

**After Each Sprint:**
- **Honest performance assessment** of team coordination and delivery quality
- **Identify missing roles and capabilities** preventing optimal performance
- **Document process improvements** and quality gate enhancements
- **Plan agent team evolution** based on identified gaps
- **Track success patterns** and anti-patterns for future reference

## Project Overview
The Gamma Timetable Extension is a comprehensive full-stack application that transforms Gamma presentations into synchronized, cloud-enabled timetables. The project consists of multiple interconnected components:

- **Chrome Extension** (MV3): Extracts slide content and generates timetables locally
- **Web Dashboard** (Next.js): User authentication, presentation management, settings
- **Backend Infrastructure** (Supabase + Netlify): Secure data persistence and API services
- **Authentication System** (Supabase Auth): User management and device pairing
- **Shared Component Library**: Common utilities, types, and abstractions across platforms
- **CI/CD Pipeline** (GitHub Actions + Netlify): Automatic deployment on push to main (4-minute cycle)
