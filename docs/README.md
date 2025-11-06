# Gamma Timetable Extension - Documentation

**Last Updated:** 2025-10-19
**Status:** ✅ Active - Governance Compliant
**Governance Version:** 1.0.0

---

## 🎯 Quick Navigation (AI Agents Start Here)

**Looking for something specific? Start here:**

1. **Current Sprint** → [/docs/sprints/](/docs/sprints/) (check latest sprint-XX folder)
2. **Security & Auth** → [/docs/security/](/docs/security/)
3. **System Architecture** → [/docs/architecture/](/docs/architecture/)
4. **Feature Specs** → [/docs/features/](/docs/features/)
5. **Audit Reports** → [/docs/audits/](/docs/audits/)
6. **Development Guides** → [/docs/guides/](/docs/guides/)
7. **Quality Standards** → [/docs/quality/](/docs/quality/)

---

## 📁 Documentation Structure

```
docs/
├── README.md                    # This file - master navigation
├── sprints/                     # Sprint planning and tracking (NESTED ONLY)
│   ├── sprint-XX/              # Each sprint is a directory
│   │   ├── README.md           # Sprint navigation (MANDATORY)
│   │   └── *.md                # Sprint documents
├── security/                    # Security, auth, compliance (IMMUTABLE)
│   ├── oauth/                  # OAuth implementation
│   ├── authentication/         # Auth flows and specs
│   └── audit-trail/            # Security audits (version tracked)
├── architecture/                # System design and architecture
├── features/                    # Feature specifications
│   ├── planned/                # Planned features
│   ├── in-progress/            # Active development
│   └── completed/              # Completed features
├── audits/                      # Technical audits and analysis
├── processes/                   # Development processes and workflows
├── guides/                      # How-to guides and tutorials
├── quality/                     # Quality standards and governance
└── archived/                    # Legacy documentation (read-only)
```

---

## 📚 Core Documentation

### Getting Started

1. **[Developer Setup Guide](DEVELOPER_SETUP.md)**
   - Prerequisites and installation
   - Quick start guide (30 minutes)
   - Environment configuration
   - Development workflow
   - Testing and debugging
   - Deployment procedures
   - **Start here if you're new to the project**

2. **[Local Development Guide](LOCAL_DEVELOPMENT.md)**
   - Setting up local development environment
   - Extension build for localhost:3000
   - Testing with local API server

### Architecture & Design

3. **[Architecture Documentation](ARCHITECTURE.md)**
   - System overview and components
   - Presentation save flow (current implementation)
   - Authentication and security model
   - Database schema and RPCs
   - **Essential reading for understanding the system**

### Operations & Support

4. **[Troubleshooting Guide](TROUBLESHOOTING.md)**
   - Quick diagnostics for common issues
   - Error code reference table
   - Known issues and workarounds
   - Debugging workflows
   - Emergency procedures (rollback, recovery)
   - **Critical for debugging production issues**

5. **[Testing Guide](TESTING.md)**
   - Test structure and organization
   - Running tests (unit, integration, E2E)
   - Writing new tests
   - Test data management
   - Continuous Integration

---

## 📋 Documentation Standards

**All documentation MUST follow:**

1. ✅ **Naming Convention:** kebab-case-lowercase.md (no CamelCase, no snake_case)
2. ✅ **Sprint Structure:** ALL sprints are nested directories with README.md
3. ✅ **README Required:** Every nested folder (2+ files) needs README.md
4. ✅ **AI Navigation:** Must be findable in ≤3 file reads
5. ✅ **Security Docs:** Immutable with version tracking
6. ✅ **Link Validation:** All internal links must be valid

**See:** [/docs/quality/DOCUMENTATION-GOVERNANCE.md](/docs/quality/DOCUMENTATION-GOVERNANCE.md) for full rules.

---

## 📖 Technical Documentation by Topic

### Database & Migrations

- **[Architecture: Database Schema](ARCHITECTURE.md#database-schema)**
  - Core tables: users, presentations, device_tokens
  - Key RPCs: `rpc_upsert_presentation_from_device`, `validate_and_touch_token`
  - Performance indexes (Sprint 35 optimizations)

- **[Troubleshooting: Database Issues](TROUBLESHOOTING.md#database-debugging)**
  - SQL query logging
  - Migration deployment procedures
  - Emergency database recovery

### Authentication & Security

- **[Architecture: Authentication & Security](ARCHITECTURE.md#authentication--security)**
  - Device token authentication flow
  - Row-Level Security (RLS) policies
  - SECURITY DEFINER pattern
  - Input validation and defense-in-depth

- **[Troubleshooting: Auth Errors](TROUBLESHOOTING.md#common-error-codes)**
  - 401 Unauthorized: Token expired/invalid
  - 404 P0001: User not found
  - Token validation procedures

### Presentation Save Flow

- **[Architecture: Presentation Save Flow](ARCHITECTURE.md#presentation-save-flow)**
  - Current state (Post Sprint 38)
  - Data flow sequence diagram
  - Request/Response contract
  - Database RPC implementation

- **[Troubleshooting: Save Issues](TROUBLESHOOTING.md#issue-failed-to-save-presentation)**
  - Step-by-step diagnostics
  - Common error codes (400, 401, 500)
  - Network debugging
  - API endpoint testing

### Development Workflow

- **[Developer Setup: Development Workflow](DEVELOPER_SETUP.md#development-workflow)**
  - Typical development cycle
  - File structure overview
  - Hot Module Replacement (HMR)
  - Database changes workflow

- **[Local Development: Build Environments](LOCAL_DEVELOPMENT.md#build-environments)**
  - Local vs Production builds
  - Environment-specific configs
  - Tree-shaking and bundle optimization

---

## 🔧 Performance & Optimization

### Database Performance (Sprint 35)

- **[Database Performance Analysis](database-performance-analysis.md)** (13KB)
  - Query optimization strategies
  - Index recommendations
  - Connection pooling

- **[Performance Optimization Action Plan](performance-optimization-action-plan.md)** (41KB)
  - Comprehensive optimization roadmap
  - Database, frontend, and DevOps improvements

### Frontend Performance

- **[React Optimization Guide](react-optimization-guide.md)** (10KB)
  - Component optimization techniques
  - State management best practices
  - Code splitting strategies

- **[React/Next.js Optimization Analysis](react-nextjs-optimization-analysis.md)** (11KB)
  - Next.js specific optimizations
  - Bundle size analysis
  - Performance monitoring

### Caching & Monitoring

- **[Cache Invalidation System](cache-invalidation-system.md)** (8KB)
  - Cache invalidation strategies
  - Implementation patterns

- **[Cache Performance Monitoring](cache-performance-monitoring-system.md)** (9KB)
  - Monitoring setup
  - Performance metrics
  - Alerting thresholds

---

## 🚀 Deployment & CI/CD

### Deployment Procedures

- **[Developer Setup: Deployment](DEVELOPER_SETUP.md#deployment)**
  - Extension deployment to Chrome Web Store
  - Web app deployment to Netlify
  - Database migration deployment

- **[Architecture: Deployment Architecture](ARCHITECTURE.md#deployment-architecture)**
  - Infrastructure overview
  - Build system (environment-specific)
  - Deployment process

### CI/CD Strategy

- **[Sprint 35 CI/CD Strategy](sprint-35-cicd-strategy.md)** (9KB)
  - Continuous Integration setup
  - Automated testing pipeline
  - Deployment automation

---

## 🛡️ Security & Emergency Procedures

### Security Model

- **[Architecture: Security Audit Trail](ARCHITECTURE.md#security-audit-trail)**
  - Vulnerability mitigations
  - Compliance (GDPR, data minimization)
  - Encryption standards

### Emergency Procedures

- **[Troubleshooting: Emergency Procedures](TROUBLESHOOTING.md#emergency-procedures)**
  - Production rollback steps
  - Database emergency recovery
  - Extension store incident response
  - Escalation contacts

---

## 📋 Sprint Documentation

### Sprint 38 (Current)

**[Sprint 38: Presentation Save Stabilization](../documents/roadmap/sprint-38-presentation-save-stabilization.md)**
- Stabilize save flow after Oct 3-4 emergency fixes
- Enable local development environment
- Comprehensive testing and documentation
- **Status:** P2 Documentation Complete ✅

### Historical Context

- **Sprint 26 (Sept 2025):** Initial RPC implementation
- **Sprint 35 (Sept 2025):** Performance optimizations, rollback from Sprint 36
- **Sprint 37 (Oct 3-4, 2025):** Emergency fixes, RPC simplification
- **Sprint 38 (Oct 5, 2025):** Stabilization and documentation

See [Architecture: Architecture Evolution](ARCHITECTURE.md#architecture-evolution) for detailed timeline.

---

## 🔍 Quick Reference

### Common Tasks

| Task | Documentation |
|------|---------------|
| **Set up local development** | [Developer Setup](DEVELOPER_SETUP.md#quick-start) |
| **Build extension for local testing** | [Developer Setup: Build Commands](DEVELOPER_SETUP.md#build-environments) |
| **Debug save errors** | [Troubleshooting: Save Issues](TROUBLESHOOTING.md#issue-failed-to-save-presentation) |
| **Create database migration** | [Developer Setup: Database Changes](DEVELOPER_SETUP.md#database-changes) |
| **Run tests** | [Testing Guide](TESTING.md) |
| **Deploy to production** | [Developer Setup: Deployment](DEVELOPER_SETUP.md#deployment) |
| **Rollback production** | [Troubleshooting: Emergency Rollback](TROUBLESHOOTING.md#emergency-rollback-production-issues) |

### Error Code Reference

| Code | Quick Fix | Full Documentation |
|------|-----------|-------------------|
| 400 VALIDATION_ERROR | Check gamma_url format | [Troubleshooting](TROUBLESHOOTING.md#validation_error-400) |
| 401 Unauthorized | Re-pair device | [Troubleshooting](TROUBLESHOOTING.md#common-error-codes) |
| 404 P0001 | Verify user in Supabase Auth | [Troubleshooting](TROUBLESHOOTING.md#p0001---user-not-found-404) |
| 500 22004 | Check device token validity | [Troubleshooting](TROUBLESHOOTING.md#22004---auth_id-is-null-500) |

### Essential Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build:local           # Build local extension
npm run test                  # Run tests

# Database
supabase start                # Start local database
supabase db reset            # Reset with migrations
supabase db push --linked    # Deploy migrations

# Deployment
npm run build                 # Build production
netlify deploy --prod        # Deploy to Netlify
```

Full command reference: [Developer Setup: Quick Reference](DEVELOPER_SETUP.md#quick-reference)

---

## 📞 Support & Escalation

### Documentation Issues

- **Missing Documentation:** Create issue in GitHub with label `documentation`
- **Outdated Information:** Submit PR with corrections
- **Unclear Instructions:** Add comment on specific doc line in GitHub

### Technical Support

**Level 1: Self-Service**
- Check [Troubleshooting Guide](TROUBLESHOOTING.md)
- Search [GitHub Issues](https://github.com/your-org/gamma-plugin/issues)
- Review [Architecture Documentation](ARCHITECTURE.md)

**Level 2: Developer Team**
- GitHub Issues: [Report bugs](https://github.com/your-org/gamma-plugin/issues/new)
- Slack: #gamma-plugin-dev
- Email: dev@yourcompany.com

**Level 3: Infrastructure Team**
- Database/migration issues
- Netlify/Supabase outages
- DNS/networking problems

**Level 4: Emergency**
- Security incidents: security@yourcompany.com
- Production outages: Slack #incidents
- Data corruption: DBA on-call

See [Troubleshooting: Support Escalation](TROUBLESHOOTING.md#support-escalation) for full details.

---

## 🔄 Documentation Maintenance

### Review Cycle

- **After Each Sprint:** Update architecture and troubleshooting docs
- **After Major Incidents:** Document root cause and fixes
- **Quarterly:** Review and update all documentation for accuracy

### Contributing to Documentation

1. **Before Writing:**
   - Check if documentation already exists
   - Review existing structure and style
   - Identify target audience (devs, ops, support)

2. **Writing Guidelines:**
   - Use clear, concise language
   - Include code examples and commands
   - Add diagrams for complex flows
   - Link to related documentation

3. **After Writing:**
   - Update this index (README.md)
   - Test all commands and procedures
   - Request peer review
   - Update "Last Updated" date

### Documentation Standards

- **Markdown:** Use GitHub-flavored markdown
- **Code Blocks:** Always specify language (```bash, ```typescript, etc.)
- **File Paths:** Use absolute paths or clearly indicate relative context
- **Commands:** Include expected output or result
- **Links:** Use relative links within docs/ folder

---

## 📈 Recent Updates

### October 2025 (Sprint 38)

- ✅ Created **ARCHITECTURE.md** - Comprehensive system architecture
- ✅ Created **TROUBLESHOOTING.md** - Debugging guide with error codes
- ✅ Created **DEVELOPER_SETUP.md** - Developer onboarding guide
- ✅ Updated **LOCAL_DEVELOPMENT.md** - Local environment setup
- ✅ Created **TESTING.md** - Testing guide and best practices
- ✅ Created **README.md** (this file) - Documentation index

### September 2025 (Sprint 35)

- Database performance optimization documentation
- React/Next.js optimization guides
- CI/CD strategy documentation

---

**Document Maintained By:** Development Team
**Last Major Review:** October 2025 (Sprint 38)
**Next Review:** After Sprint 39 or major architectural changes
