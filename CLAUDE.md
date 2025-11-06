# Claude Code Configuration - SPARC Development Environment

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories
4. **USE CLAUDE CODE'S TASK TOOL** for spawning agents concurrently, not just MCP

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool (Claude Code)**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 🎯 CRITICAL: Claude Code Task Tool for Agent Execution

**Claude Code's Task tool is the PRIMARY way to spawn agents:**
```javascript
// ✅ CORRECT: Use Claude Code's Task tool for parallel agent execution
[Single Message]:
  Task("Research agent", "Analyze requirements and patterns...", "researcher")
  Task("Coder agent", "Implement core features...", "coder")
  Task("Tester agent", "Create comprehensive tests...", "tester")
  Task("Reviewer agent", "Review code quality...", "reviewer")
  Task("Architect agent", "Design system architecture...", "system-architect")
```

**MCP tools are ONLY for coordination setup:**
- `mcp__claude-flow__swarm_init` - Initialize coordination topology
- `mcp__claude-flow__agent_spawn` - Define agent types for coordination
- `mcp__claude-flow__task_orchestrate` - Orchestrate high-level workflows

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

## 🔄 AI-ASSISTED CODING LIFECYCLE (Complements SPARC)

### **🚨 CRITICAL: ALWAYS CHECK EXISTING STATE FIRST**
**MANDATORY FIRST STEP BEFORE ANY WORK:**
1. **Read current codebase** - Check what already exists
2. **Test current state** - Run/build/demo existing functionality
3. **Report findings immediately** - Don't waste tokens on redundant analysis
4. **NEVER deploy swarms/agents for already completed work**

### **6-Step Engineering Process (ONLY after verifying work needed):**

1. **Research/Audit** - Context-specific analysis (market, technical, user research - scope varies by task)
2. **Plan Sprint** - Task breakdown, sprint planning, and roadmap alignment
3. **Code** - Implementation following SPARC methodology phases
4. **Testing, Validating, QA** - Quality assurance, validation, and testing
5. **Cleanup** - Code review, optimization, and technical debt reduction
6. **Commit → Code review → Deploy** - Git workflow and deployment process

### **🤖 AGENTIC SYSTEM CAPABILITIES AWARENESS:**

**Claude-Flow Swarm = Superhuman Development Speed:**
- **Time Estimates**: Sprint planning uses human timelines (hours/days) but actual execution is much faster
- **Real-time Calibration**: Update time estimates during execution to reflect true agentic speed
- **Concurrent Execution**: Multiple agents can work simultaneously on different parts
- **CLI Tool Access**: Full access to database migrations, build tools, testing frameworks, deployment tools

**Database Migration Authority:**
- **Direct Implementation**: Can create and execute database migrations via Supabase CLI or SQL
- **Schema Changes**: Full authority to modify database structure, indexes, constraints
- **Data Migrations**: Can implement data transformation and migration scripts
- **Production Safety**: Use proper migration patterns (CREATE INDEX CONCURRENTLY, etc.)

**Full Stack Implementation Power:**
- **Frontend**: React/Next.js optimization, state management, performance tuning
- **Backend**: API development, database queries, authentication flows
- **Infrastructure**: Netlify configuration, CI/CD pipelines, monitoring setup
- **DevOps**: Build optimization, deployment automation, performance monitoring

**Example Capability Adjustment:**
```
Sprint Plan: "Task 1.1: Database indexes (4-6 hours)"
Reality: "Database indexes implemented in 15 minutes via Supabase CLI"

Sprint Plan: "Task 1.2: React optimization (6-8 hours)"
Reality: "React.memo and useCallback added to all components in 30 minutes"
```

### **Integration with SPARC Methodology:**
- **🚨 PRE-STEP**: Always check existing state first (read code, test functionality)
- **Research/Audit** feeds into SPARC **Specification** phase (ONLY if work needed)
- **Plan Sprint** structures SPARC workflow execution and agent coordination
- **Code** phase executes full SPARC cycle (Specification → Pseudocode → Architecture → Refinement → Completion)
- **Testing/QA** validates SPARC outputs and ensures quality
- **Cleanup** ensures maintainable, production-ready code
- **Commit workflow** maintains project integrity and deployment readiness

### **🚨 TOKEN WASTE PREVENTION PROTOCOL:**
1. **ALWAYS** read current sprint files and codebase first
2. **ALWAYS** test/run existing functionality before analysis
3. **IMMEDIATELY** report if work already complete
4. **NEVER** deploy agents/swarms for completed tasks
5. **ASK** for next steps rather than assume work needed

### **⚡ AGENTIC EXECUTION SPEED CALIBRATION:**
1. **During Sprint Execution**: Update time estimates to reflect actual agentic speed
2. **Database Migrations**: Can be implemented immediately via CLI tools (not "hours")
3. **Code Changes**: Multiple file edits happen concurrently (not sequential "hours")
4. **Testing & Validation**: Automated via available CLI tools and scripts
5. **Report Actual vs Planned**: Always update sprint progress with real completion times

### **📁 DIRECTORY MANAGEMENT RULES:**
**CRITICAL: NEVER create new directories without checking existing structure first**

**MANDATORY BEFORE CREATING ANY DIRECTORY:**
1. **Search existing tree**: Use `find . -type d -name "*keyword*"` or `ls -la` to check existing folders
2. **Use similar directories**: If `/docs/research` exists, use it instead of creating `/research`
3. **Follow existing patterns**: Match the project's established folder structure
4. **Only create NEW directories** if no similar/suitable directory exists

**Examples:**
- ❌ `mkdir docs/research` without checking if it exists
- ✅ `find . -name "*research*" -type d` first, then use existing folder
- ❌ `mkdir src/components` without checking existing structure
- ✅ Check `ls src/` first, use existing patterns

**File Organization Priority:**
1. Use existing directories that match purpose
2. Follow established project structure patterns
3. Only create new directories when absolutely necessary
4. Ask user before creating new top-level directories

**CRITICAL DOCUMENT ORGANIZATION:**
Following [Documentation Governance](/docs/quality/DOCUMENTATION-GOVERNANCE.md):

- **Audits**: ALWAYS save to `/docs/audits/` folder (technical audits, root cause analysis)
- **Security Audits**: ALWAYS save to `/docs/security/audit-trail/` (immutable with version tracking)
- **Sprint Plans**: ALWAYS save to `/docs/sprints/sprint-XX/` folder (nested directories ONLY)
  - Create new sprints: `npm run sprint:create <number> "<name>"` (manual creation FORBIDDEN)
  - Each sprint MUST have: README.md + .sprint-metadata.json
- **Research**: Use `/docs/audits/` for technical analysis and research reports
- **Architecture**: Use `/docs/architecture/` for system design and architecture docs
- **Features**: Use `/docs/features/{planned,in-progress,completed}/` for feature specs
- **Guides**: Use `/docs/guides/` for how-to guides and tutorials
- **Processes**: Use `/docs/processes/` for development workflows and processes

**File Naming Convention (MANDATORY):**
- ✅ `kebab-case-lowercase.md` - ALWAYS use this format
- ❌ `CamelCase.md`, `snake_case.md`, `UPPERCASE.md` - FORBIDDEN
- ❌ Flat sprint files like `sprint-01-name.md` - MUST be nested in `sprint-01/` directory

**Legacy Documentation:**
- `/docs/archived/` - Legacy docs moved here (read-only, for historical reference only)

### **🧹 CLEANUP PHASE LESSONS LEARNED (Step 5):**

**CRITICAL: Cleanup is NOT optional - it's MANDATORY before commit:**

**What Must Be Removed:**
1. **Stale Code Files** - Remove unused/old component files (e.g., `TextEditor.tsx` when replaced by `Editor.tsx`)
2. **AI-Generated Comments** - Remove ALL unnecessary AI artifacts:
   - ❌ `/* Johnny Ive invisible interface */`
   - ❌ `// Add enhanced list support`
   - ❌ `// Beautiful selection styling`
   - ✅ Keep only comments that help NEXT DEVELOPER understand logic
3. **Misleading Names** - Fix development artifacts:
   - ❌ `MilkdownEditor.tsx` when using TipTap
   - ❌ Component names that don't match technology used
   - ✅ Names must accurately reflect implementation
4. **Build Artifacts** - Clean `dist/`, temp files, empty directories
5. **Console Noise** - Remove development logs, unused imports
6. **Dependency Bloat** - Remove unused packages from package.json

**Cleanup Validation Process:**
```bash
# 1. Remove stale files
find . -name "*.old" -o -name "*.backup" -delete
rm -rf dist/

# 2. Validate everything still works
npm run lint
npm run type-check
npm run build

# 3. Check file naming accuracy
ls src/components/  # Names should match technology used

# 4. Review comments for AI artifacts
grep -r "Johnny\|Add enhanced\|Beautiful\|AI generated" src/
```

**Why This Matters:**
- **Professional Code** - No development artifacts in production
- **Team Confusion** - Future developers don't get misled by wrong names
- **Maintainability** - Clean code is easier to understand and modify
- **Performance** - No unused code bloating bundle size

**Remember: USER WILL CALL OUT MISSED CLEANUP** - Always do thorough cleanup before claiming work complete!

## Project Overview

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## SPARC Commands

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Batchtools Commands
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL EXECUTION:
- **Task tool**: Spawn and run agents concurrently for actual work
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools ONLY COORDINATE:
- Swarm initialization (topology setup)
- Agent type definitions (coordination patterns)
- Task orchestration (high-level planning)
- Memory management
- Neural features
- Performance tracking
- GitHub integration

**KEY**: MCP coordinates the strategy, Claude Code's Task tool executes with real agents.

## 🚀 Quick Setup

```bash
# Add MCP servers (Claude Flow required, others optional)
claude mcp add claude-flow npx claude-flow@alpha mcp start
claude mcp add ruv-swarm npx ruv-swarm mcp start  # Optional: Enhanced coordination
claude mcp add flow-nexus npx flow-nexus@latest mcp start  # Optional: Cloud features
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

### Flow-Nexus MCP Tools (Optional Advanced Features)
Flow-Nexus extends MCP capabilities with 70+ cloud-based orchestration tools:

**Key MCP Tool Categories:**
- **Swarm & Agents**: `swarm_init`, `swarm_scale`, `agent_spawn`, `task_orchestrate`
- **Sandboxes**: `sandbox_create`, `sandbox_execute`, `sandbox_upload` (cloud execution)
- **Templates**: `template_list`, `template_deploy` (pre-built project templates)
- **Neural AI**: `neural_train`, `neural_patterns`, `seraphina_chat` (AI assistant)
- **GitHub**: `github_repo_analyze`, `github_pr_manage` (repository management)
- **Real-time**: `execution_stream_subscribe`, `realtime_subscribe` (live monitoring)
- **Storage**: `storage_upload`, `storage_list` (cloud file management)

**Authentication Required:**
- Register: `mcp__flow-nexus__user_register` or `npx flow-nexus@latest register`
- Login: `mcp__flow-nexus__user_login` or `npx flow-nexus@latest login`
- Access 70+ specialized MCP tools for advanced orchestration

## 🚀 Agent Execution Flow with Claude Code

### The Correct Pattern:

1. **Optional**: Use MCP tools to set up coordination topology
2. **REQUIRED**: Use Claude Code's Task tool to spawn agents that do actual work
3. **REQUIRED**: Each agent runs hooks for coordination
4. **REQUIRED**: Batch all operations in single messages

### Example Full-Stack Development:

```javascript
// Single message with all agent spawning via Claude Code's Task tool
[Parallel Agent Execution]:
  Task("Backend Developer", "Build REST API with Express. Use hooks for coordination.", "backend-dev")
  Task("Frontend Developer", "Create React UI. Coordinate with backend via memory.", "coder")
  Task("Database Architect", "Design PostgreSQL schema. Store schema in memory.", "code-analyzer")
  Task("Test Engineer", "Write Jest tests. Check memory for API contracts.", "tester")
  Task("DevOps Engineer", "Setup Docker and CI/CD. Document in memory.", "cicd-engineer")
  Task("Security Auditor", "Review authentication. Report findings via hooks.", "reviewer")
  
  // All todos batched together
  TodoWrite { todos: [...8-10 todos...] }
  
  // All file operations together
  Write "backend/server.js"
  Write "frontend/App.jsx"
  Write "database/schema.sql"
```

## 📋 Agent Coordination Protocol

### Every Agent Spawned via Task Tool MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT WORKFLOW: MCP Coordinates, Claude Code Executes

```javascript
// Step 1: MCP tools set up coordination (optional, for complex tasks)
[Single Message - Coordination Setup]:
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }

// Step 2: Claude Code Task tool spawns ACTUAL agents that do the work
[Single Message - Parallel Agent Execution]:
  // Claude Code's Task tool spawns real agents concurrently
  Task("Research agent", "Analyze API requirements and best practices. Check memory for prior decisions.", "researcher")
  Task("Coder agent", "Implement REST endpoints with authentication. Coordinate via hooks.", "coder")
  Task("Database agent", "Design and implement database schema. Store decisions in memory.", "code-analyzer")
  Task("Tester agent", "Create comprehensive test suite with 90% coverage.", "tester")
  Task("Reviewer agent", "Review code quality and security. Document findings.", "reviewer")
  
  // Batch ALL todos in ONE call
  TodoWrite { todos: [
    {id: "1", content: "Research API patterns", status: "in_progress", priority: "high"},
    {id: "2", content: "Design database schema", status: "in_progress", priority: "high"},
    {id: "3", content: "Implement authentication", status: "pending", priority: "high"},
    {id: "4", content: "Build REST endpoints", status: "pending", priority: "high"},
    {id: "5", content: "Write unit tests", status: "pending", priority: "medium"},
    {id: "6", content: "Integration tests", status: "pending", priority: "medium"},
    {id: "7", content: "API documentation", status: "pending", priority: "low"},
    {id: "8", content: "Performance optimization", status: "pending", priority: "low"}
  ]}
  
  // Parallel file operations
  Bash "mkdir -p app/{src,tests,docs,config}"
  Write "app/package.json"
  Write "app/src/server.js"
  Write "app/tests/server.test.js"
  Write "app/docs/API.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**

## Hooks Integration

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage

### Session Management
- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

## 🗃️ VALIDATED SUPABASE MIGRATION DEPLOYMENT PROCEDURE

**CRITICAL: Sprint 35 Validated Process (September 2025)**

### **✅ CORRECT: Database Migration Deployment**

**Step 1: Create Migration**
```bash
# Create new migration file (if not exists)
supabase migration new performance_indexes
```

**Step 2: Write SQL Migration**
```sql
-- Example: supabase/migrations/20250925000001_performance_indexes.sql
CREATE INDEX CONCURRENTLY idx_presentations_user_updated
ON presentations (user_id, updated_at DESC);
```

**Step 3: Fix Migration History (if needed)**
```bash
# If remote migrations are out of sync
supabase migration repair --status reverted [migration_id]
```

**Step 4: Deploy to Remote Database**
```bash
# Deploy all pending migrations
supabase db push --linked --include-all

# For dry-run testing first:
supabase db push --linked --dry-run
```

**Step 5: Validate Deployment**
```bash
# Check migration status (local vs remote)
supabase migration list

# Should show migration synchronized between Local and Remote columns
```

### **❌ WRONG: These Commands Don't Deploy**

**These are METADATA-ONLY operations:**
```bash
supabase migration repair --status applied  # Only fixes history table
supabase migration up                       # Only applies locally
supabase db reset                          # Only resets local database
```

### **🚨 KEY INSIGHTS FROM SPRINT 35 PR #1 DEBUGGING:**

1. **`supabase migration repair`** = Metadata fix only, does NOT execute SQL
2. **`supabase db push --linked`** = ACTUAL migration execution on remote database
3. **`supabase migration list`** showing sync ≠ SQL executed = Migration history sync doesn't guarantee SQL commands ran
4. **`--include-all` flag** = Required when local migrations exist before remote history
5. **`CONCURRENTLY` keyword** = Can fail silently in some PostgreSQL configurations
6. **`NOW()` function breaks partial indexes** = Must use immutable functions only in WHERE clauses
7. **NOTICE messages = success** = "index does not exist, skipping" indicates DROP commands executed
8. **Multiple migration attempts may be needed** = Complex migration conflicts require iterative repair

### **CRITICAL VALIDATION HIERARCHY (Sprint 35 Validated):**
1. 🥇 **Supabase Dashboard Visual Check** = GOLD STANDARD (actual database state)
2. 🥈 **Migration List Local|Remote Sync** = Shows deployment status (but not execution success)
3. 🥉 **No Errors During Push** = Migration didn't fail (but doesn't guarantee execution)
4. ❌ **Internal API Endpoints** = Project-specific, often don't exist

### **Production Safety:**
- Always use `CREATE INDEX CONCURRENTLY` for large tables
- Test with `--dry-run` flag first
- Monitor migration performance during deployment
- Have rollback commands ready (`DROP INDEX` statements)

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
- Flow-Nexus Platform: https://flow-nexus.ruv.io (registration required for cloud features)

---

Remember: **Claude Flow coordinates, Claude Code creates!**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
