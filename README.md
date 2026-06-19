# skillguard

**Catch broken AI skill definitions before they reach production.**

You wrote an agent skill — but did you remember `version`? Are the tool references valid? Any circular dependencies? `skillguard` validates all of that in milliseconds, with CI-friendly exit codes and A-F grading.

## Why

AI agent frameworks (LangChain, CrewAI, AutoGen, OpenClaw) rely on skill/agent definition files. A missing `version`, a typo in a dependency name, or a circular reference can silently break your agent in production. `skillguard` is the linting layer that catches these issues before deploy.

## Install

```bash
npm install -g skillguard
```

## Quick Start

```bash
# Validate a single skill file
skillguard check ./skills/my-skill.json

# Validate all skills in a directory
skillguard check ./skills/

# CI mode — fail if score below threshold
skillguard check ./skills/ --min-score B

# JSON output for CI pipelines
skillguard check ./skills/ --format json
```

## Comparison

| Feature | skillguard | jsonschema | custom CI script | Manual review |
|---------|-----------|------------|-----------------|---------------|
| AI skill schema validation | ✅ Built-in | Requires custom schema | Build from scratch | ❌ | 
| Circular dependency detection | ✅ Automatic | ❌ | Build from scratch | ❌ |
| Duplicate name detection | ✅ Automatic | ❌ | Build from scratch | ❌ |
| Markdown SKILL.md support | ✅ Built-in | ❌ | ❌ | ❌ |
| Health scoring (A-F) | ✅ Built-in | ❌ | Build from scratch | ❌ |
| CI exit codes | ✅ Zero config | With custom logic | Build from scratch | ❌ |
| Dependencies | Zero | ajv (1.2MB) | Varies | — |
| Setup time | 30 seconds | Define JSON Schema + wire validator | Hours | Ongoing |

## Real-World Examples

### 1. Pre-commit Hook (catch broken skills before commit)

```bash
# .git/hooks/pre-commit
#!/bin/sh
skillguard check ./skills/ --min-score B || exit 1
```

Every commit automatically validates all skill files. If any skill scores below B, the commit is blocked. Zero configuration, zero dependencies.

### 2. CI Pipeline Gate (GitHub Actions)

```yaml
# .github/workflows/validate-skills.yml
name: Validate Skills
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g skillguard
      - run: skillguard check ./skills/ --format json > skill-report.json
      - run: skillguard check ./skills/ --min-score B
      - uses: actions/upload-artifact@v4
        with:
          name: skill-report
          path: skill-report.json
```

The JSON output can be posted as a PR comment, tracked over time, or fed into dashboards. The `--min-score` flag ensures no broken skills merge.

### 3. Multi-Agent Governance (validate SKILL.md files)

```bash
# Validate OpenClaw / CrewAI / AutoGen skill markdown files
skillguard check SKILL.md --format json
skillguard check ./agent-skills/ --verbose
```

If you manage a fleet of AI agents with markdown-based skill definitions, `skillguard` checks that each SKILL.md has required sections (Name, Description, Usage), flags missing optional sections (Parameters, Behavior, Constraints), and scores completeness.

## Usage

### Programmatic

```js
const { validate, validateDir, score } = require('skillguard');

// Validate a single file
const result = validate('./skills/my-skill.json');
console.log(result.errors);   // [{ field, message, severity }]
console.log(result.warnings); // [{ field, message }]
console.log(result.grade);    // 'A'

// Validate a directory (cross-file checks: duplicates, circular deps)
const dirResult = validateDir('./skills/');
console.log(dirResult.overall); // { grade: 'B', points: 75, max: 100 }
```

### Markdown Skill Files

```js
const { validateMarkdown } = require('skillguard/markdown');

const result = validateMarkdown('./SKILL.md');
console.log(result.grade);        // 'A'
console.log(result.errors);       // Missing required sections
console.log(result.sections);     // Extracted content per section
```

## Skill Schema

Skillguard expects skills to follow this structure (JSON or YAML):

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Does something useful",
  "tools": ["tool-a", "tool-b"],
  "input": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query" }
    },
    "required": ["query"]
  },
  "output": {
    "type": "object",
    "properties": {
      "result": { "type": "string" }
    }
  },
  "dependencies": ["other-skill"],
  "config": {
    "timeout": 30000,
    "retries": 3
  }
}
```

## Checks Performed

| # | Check | Severity |
|---|-------|----------|
| 1 | Required fields present (`name`, `version`, `description`) | error |
| 2 | Name follows naming conventions (lowercase-hyphen) | warning |
| 3 | Version is semver (`x.y.z`) | error |
| 4 | Description is meaningful (10–500 chars) | warning |
| 5 | Tools array contains valid string references | error |
| 6 | Input schema has `type` field | warning |
| 7 | Output schema has `type` field | warning |
| 8 | Dependencies exist (when directory given) | error |
| 9 | No circular dependencies | error |
| 10 | Config values in valid ranges | warning |
| 11 | No duplicate skill names | error |
| 12 | Markdown: required sections present | error |

## Scoring

| Grade | Points | Meaning |
|-------|--------|---------|
| A | 90–100 | Production-ready |
| B | 80–89 | Minor issues, ship-able |
| C | 70–79 | Needs attention |
| D | 60–69 | Problematic |
| F | 0–59 | Do not ship |

Penalties: -20 per error, -5 per warning.

## License

MIT
