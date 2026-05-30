# skillguard - Security Scanner for AI Agent Skills

The security scanner for AI agent skills. Detects dangerous patterns, permission conflicts, and security risks in skill definitions before you install them.

## Why skillguard?

The AI coding agent skills ecosystem is exploding, but there's zero security tooling. Skills are markdown/config files that get executed with full shell/file/network access - and you have no idea what they actually do.

skillguard scans skill definitions and flags:
- 🔴 Dangerous patterns (shell injection, file exfiltration, network calls)
- ⚠️ Permission mapping (exactly what each skill can access)
- 🔥 Trust scoring (green/yellow/red based on capability surface)
- 📋 Diff mode (compare skill versions)
- 💥 Conflict detection (contradictory instructions between skills)

## Installation

```bash
npm install -g skillguard
```

Or use directly:

```bash
npx skillguard ./skills
```

## Usage

### Scan a skills directory

```bash
skillguard ./my-skills
```

### Scan a specific skill file

```bash
skillguard ./my-skills/skill-name.md
```

### Compare skill versions (diff mode)

```bash
skillguard diff skill-v1.md skill-v2.md
```

### Check skills in CI mode (exit 1 if issues found)

```bash
skillguard --ci ./my-skills
```

### Quiet mode (only show errors)

```bash
skillguard --quiet ./my-skills
```

## Output Examples

### Basic Scan
```bash
$ skillguard ./my-skills

🔍 Scanning 5 skills in ./my-skills

🟢 git-workflow.md
   - Trust score: GREEN (safe file operations only)
   - Permissions: git operations, file reading
   - No security risks detected

🟡 code-quality.md
   - Trust score: YELLOW (network access for linting)
   - Permissions: file system, network requests
   - ⚠️  Network access detected for external tools

🔥 auto-approve.md
   - Trust score: RED (full system access)
   - Permissions: shell execution, file write, network
   - 🔴 Risk: Shell execution capability
   - 🔴 Risk: File system write access
   - 🔴 Risk: Network communication allowed
```

### Conflict Detection
```bash
$ skillguard ./conflicting-skills

🔍 Scanning 3 skills in ./conflicting-skills

⚠️  CONFLICT DETECTED:
   "tabs-only.md" requires tabs for indentation
   "spaces-only.md" requires spaces for indentation
   → Agent confusion: inconsistent formatting rules

⚠️  TOOL OVERLAP:
   "git-auto-commit.md" and "git-workflow.md" both register git commit command
   → Potential duplicate tool registration

💡 MERGE SUGGESTION:
   "git-auto-commit.md" and "git-workflow.md" share 60% instructions
   → Consider merging into single comprehensive git skill
```

## Supported Skill Formats

- **Claude Code Skills**: `SKILL.md` files with tool definitions
- **Codex Skills**: JSON/YAML skill configurations  
- **Cursor Rules**: Markdown rule files with shell commands
- **MCP Configs**: Model Context Protocol configurations
- **Custom Skills**: Any text-based skill definition

## Security Patterns Detected

| Pattern | Risk Level | Description |
|---------|------------|-------------|
| Shell execution (`$()`, ``, `exec`) | 🔴 RED | Remote code execution risk |
| File write access (`>`, `>>`, `writeFile`) | 🔴 RED | Data destruction/overwrite risk |
| Network calls (`curl`, `wget`, `fetch`) | 🟡 YELLOW | Data exfiltration risk |
| API keys/secrets | 🔴 RED | Credential exposure risk |
| File system access (`/`, `~`, `$HOME`) | 🟡 YELLOW | System access risk |
| Environment variables (`$VAR`, `${VAR}`) | 🟡 YELLOW | Variable injection risk |

## Development

```bash
git clone https://github.com/sulthonzh/skillguard
cd skillguard
npm install
npm run dev  # Run in development mode
npm test     # Run tests
npm run lint # Lint code
```

## Roadmap

- [ ] Semantic conflict detection using embeddings
- [ ] Auto-merge suggestions for compatible skills
- [ ] Integration with GitHub Skills marketplace
- [ ] CI/CD plugin for automated scanning
- [ ] Enterprise policy enforcement
- [ ] Skill dependency resolution

## Contributing

Found a security pattern we miss? Have ideas for conflict detection? Open an issue or submit a pull request!

## License

MIT - see LICENSE file