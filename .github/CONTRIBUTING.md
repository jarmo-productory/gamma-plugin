# Contributing to Gamma Timetable Extension

Thank you for your interest in contributing! This guide will help you get started.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Documentation Standards](#documentation-standards)
4. [Code Quality](#code-quality)
5. [Pull Request Process](#pull-request-process)

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Chrome browser (for extension testing)
- Supabase CLI (for database work)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/gamma-plugin.git
cd gamma-plugin

# Install dependencies
npm install

# Start development server
npm run dev
```

**Full setup guide:** [/docs/DEVELOPER_SETUP.md](/docs/DEVELOPER_SETUP.md)

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

- Write code following our [coding standards](/docs/guides/)
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run tests
npm run test

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

### 4. Commit Your Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature description"
```

**Commit message format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## Documentation Standards

**CRITICAL:** We follow strict documentation governance rules.

### Documentation Structure

All documentation lives in `/docs/` with this structure:

```
docs/
├── sprints/          # Sprint planning (nested directories ONLY)
├── security/         # Security docs (immutable)
├── architecture/     # System architecture
├── features/         # Feature specs
├── audits/           # Technical audits
├── guides/           # How-to guides
├── processes/        # Development processes
└── quality/          # Quality standards
```

### File Naming Rules

**MANDATORY:**
- ✅ `kebab-case-lowercase.md` - ALWAYS use this format
- ❌ `CamelCase.md`, `snake_case.md`, `UPPERCASE.md` - FORBIDDEN

### Sprint Documentation

**Creating a new sprint:**

```bash
# Use automation script (manual creation FORBIDDEN)
npm run sprint:create <number> "<name>"

# Example:
npm run sprint:create 40 "Performance Optimization"
```

This auto-generates:
- `docs/sprints/sprint-40/` directory
- `docs/sprints/sprint-40/README.md` (from template)
- `docs/sprints/sprint-40/.sprint-metadata.json` (tracking)

**Sprint requirements:**
- ✅ Nested directory structure (sprint-XX/)
- ✅ README.md with required sections
- ✅ `.sprint-metadata.json` tracking file
- ❌ NO flat files like `sprint-40-name.md`

### Documentation Validation

Before committing documentation changes:

```bash
# Validate structure
npm run docs:validate

# Check for broken links
npm run docs:check-links

# Fix naming violations
npm run docs:fix-naming
```

**Full documentation rules:** [/docs/quality/DOCUMENTATION-GOVERNANCE.md](/docs/quality/DOCUMENTATION-GOVERNANCE.md)

---

## Code Quality

### Before Committing

Run quality checks:

```bash
# All quality checks
npm run quality

# Individual checks
npm run type-check
npm run lint
npm run test
npm run build
```

### Code Style

- **TypeScript:** Use strict mode
- **React:** Functional components with hooks
- **Formatting:** Prettier (automatic via pre-commit)
- **Linting:** ESLint (fix with `npm run lint:fix`)

### Testing

- Write tests for new features
- Maintain >80% code coverage
- Test user-facing functionality
- Test error handling

**Testing guide:** [/docs/TESTING.md](/docs/TESTING.md)

---

## Pull Request Process

### 1. Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create PR on GitHub
# Use descriptive title and description
```

### 2. PR Requirements

**Your PR MUST:**
- ✅ Pass all CI/CD checks
- ✅ Include tests for new code
- ✅ Update documentation
- ✅ Follow naming conventions
- ✅ Have clear commit messages
- ✅ Address review feedback

**Documentation PRs MUST:**
- ✅ Pass `npm run docs:validate`
- ✅ No broken links
- ✅ Follow file naming rules
- ✅ Include README.md for new nested folders
- ✅ Update relevant navigation

### 3. Code Review

- Respond to review comments
- Make requested changes
- Re-request review when ready
- Be patient and respectful

### 4. Merge

Once approved:
- **Squash and merge** (for feature branches)
- **Merge commit** (for release branches)
- Delete branch after merge

---

## Common Issues

### Pre-commit Hooks Failing

**Documentation validation:**
```bash
# Fix naming violations
npm run docs:fix-naming

# Re-validate
npm run docs:validate
```

**Linting failures:**
```bash
# Auto-fix linting issues
npm run lint:fix
```

### Build Failures

```bash
# Clean build
rm -rf packages/*/dist node_modules
npm install
npm run build
```

### Test Failures

```bash
# Run tests in watch mode
npm run test:watch

# Run specific test
npm test -- path/to/test.spec.ts
```

---

## Getting Help

**Questions?**
- Check [Troubleshooting Guide](/docs/TROUBLESHOOTING.md)
- Search [existing issues](https://github.com/your-org/gamma-plugin/issues)
- Ask in Slack: #gamma-plugin-dev

**Found a bug?**
- Check if already reported
- Create new issue with reproduction steps
- Include error logs and screenshots

**Documentation unclear?**
- Create issue with label `documentation`
- Suggest improvements via PR

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow project guidelines

---

**Thank you for contributing!** 🎉

Your contributions make this project better for everyone.
