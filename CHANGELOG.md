# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ESLint flat config (eslint.config.mjs) with typescript-eslint recommended rules
- c8 coverage reporting (`test:coverage` script)
- `lint` script and wired `prepublishOnly` to run tests + lint

### Fixed
- Removed unused `score` import from cli.js
- Removed unused destructured `info` variable in `score()` function
- Prefixed unused `options` parameter with `_options` in `validateSkill()`
- Changed `let val` to `const val` in YAML parser (never reassigned)
- Fixed `no-regex-spaces` in markdown.js: replaced literal 4-space regex with `{4}` quantifier
- Added `coverage/` to .gitignore

## [1.1.0] — 2026-06-19

### Added
- `version`/`--version`/`-V` CLI flag
- `exports` field in package.json for clean ESM/CJS consumption
- `files` field to limit npm package contents
- `engines` field requiring Node >= 18
- `prepublishOnly` script — runs tests before publish
- `test:core` and `test:markdown` granular test scripts
- Comprehensive README with comparison table, 3 real-world examples (pre-commit hook, CI pipeline gate, multi-agent governance), programmatic API docs, scoring table
- CHANGELOG.md

### Changed
- `test` script now runs both core and markdown test suites
- CLI help text now shows version number
- Keywords expanded for better discoverability

### Removed
- Stale `tmp_test/` directory (build artifact)

## [1.0.0] — 2026-06-10

### Added
- Initial release
- Validate JSON and YAML skill definition files
- Required field checking (`name`, `version`, `description`)
- Name convention validation (lowercase-hyphen)
- Semver version validation
- Description quality checks (length, meaningfulness)
- Tools array validation
- Input/output schema validation
- Config value range validation (timeout, retries)
- Duplicate skill name detection (directory mode)
- Circular dependency detection (directory mode)
- A-F health scoring with point-based penalties
- CI-friendly exit codes and `--min-score` threshold
- JSON output format (`--format json`)
- Verbose mode (`--verbose`)
- Markdown SKILL.md validation support
  - Section extraction (Name, Description, Usage, Parameters, Behavior, Constraints, Dependencies, Examples, Errors)
  - Heading-based section parsing
  - Content validation (code examples in Usage, description length, name length)
  - File statistics (line count, heading count, byte size)
- Zero dependencies — pure Node.js stdlib
