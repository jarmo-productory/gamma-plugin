# Agent Memory System

## Format: TOML

All agent memories are stored in TOML format for optimal token efficiency and structured data access.

## Structure

```toml
[meta]
agent = "agent-name"
updated = 2025-08-18T12:35:00Z
sprint = "current-sprint"
role = "brief description"

[patterns]
# Current success patterns (5-7 max)
key = "value"

[metrics]
# Quantifiable current state
metric = value

[tools]
# Active toolchain
category = ["tool1", "tool2"]

[lessons]
# Sprint learnings
sprint_x = ["lesson1", "lesson2"]

[next]
# Action items
tasks = ["task1", "task2"]
priority = "focus area"
```

## Files

- `qa-engineer-memory.toml` - Quality assurance patterns and validation
- `full-stack-memory.toml` - Implementation patterns and workflow
- `tech-lead-memory.toml` - Architecture decisions and strategy
- `ux-ui-memory.toml` - Design patterns and user experience
- `devops-memory.toml` - Infrastructure and deployment

## Benefits

- **50% fewer tokens** than Markdown format
- **Structured data** for programmatic access
- **Clean diffs** in Git
- **Type preservation** (numbers, dates, booleans)
- **Schema validation** possible

## Usage

```javascript
// Node.js example
const fs = require('fs');
const toml = require('@iarna/toml');

const memory = toml.parse(fs.readFileSync('qa-engineer-memory.toml', 'utf8'));
console.log(memory.patterns.e2e_testing); // "Playwright automation > agent reports"
```

## Migration

Old `.md` files archived but TOML files are now the source of truth for agent memories.