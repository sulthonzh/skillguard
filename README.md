# skillguard

Validate AI skill/agent definitions before they blow up in production.

You know the drill — you write an agent skill definition, deploy it, and then realize the schema is wrong, required fields are missing, or the tool references don't exist. `skillguard` catches that stuff before you ship.

## What it does

- Validates skill/agent definition files (JSON or YAML)
- Checks required fields, types, and structure
- Validates tool references exist and are properly configured
- Detects circular dependencies between skills
- Scores overall health (A-F grading)
- CI-friendly — exit codes and JSON output

## Install

```bash
npm install -g skillguard
```

## Usage

### CLI

```bash
# Validate a single skill file
skillguard check ./skills/my-skill.json

# Validate all skills in a directory
skillguard check ./skills/

# CI mode — fail if score below threshold
skillguard check ./skills/ --min-score B

# JSON output
skillguard check ./skills/ --format json
```

### Programmatic

```js
const { validate, score } = require('skillguard');

const result = validate('./skills/my-skill.json');
console.log(result.errors);   // [{ field, message, severity }]
console.log(result.warnings); // [{ field, message }]
console.log(score(result));   // { grade: 'A', points: 95/100 }
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
| 1 | Required fields present | error |
| 2 | Name follows naming conventions | warning |
| 3 | Version is semver | error |
| 4 | Description is meaningful (not empty/too short) | warning |
| 5 | Tools array is valid | error |
| 6 | Input schema is valid | warning |
| 7 | Output schema is valid | warning |
| 8 | Dependencies exist (when directory given) | error |
| 9 | No circular dependencies | error |
| 10 | Config values are in valid ranges | warning |
| 11 | No duplicate skill names | error |
| 12 | File structure is clean | info |

## License

MIT
