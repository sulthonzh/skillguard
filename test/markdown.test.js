#!/usr/bin/env node
'use strict';

const { validateMarkdown, extractSections, parseHeadings } = require('../src/markdown');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TMP = '/tmp/skillguard-md-test';
let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (err) { failed++; console.log(`  ❌ ${name}: ${err.message}`); }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function setup() {
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });
}

function writeFile(name, content) {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, content);
  return p;
}

function runCLI(args) {
  try {
    return { stdout: execSync(`node ${path.join(__dirname, '../src/cli.js')} ${args}`, { encoding: 'utf-8', timeout: 5000 }), exitCode: 0 };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', exitCode: e.status };
  }
}

setup();

console.log('parseHeadings');
test('parses markdown headings', () => {
  const headings = parseHeadings('# Title\n## Section\n### Sub');
  assert(headings.length === 3, `Expected 3, got ${headings.length}`);
  assert(headings[0].level === 1);
  assert(headings[1].text === 'Section');
});

test('ignores non-heading lines', () => {
  const headings = parseHeadings('Hello\n## Heading\nWorld');
  assert(headings.length === 1);
  assert(headings[0].text === 'Heading');
});

console.log('\nextractSections');
test('extracts name section', () => {
  const sections = extractSections('## Name\nmy-skill\n## Description\nSome text here.');
  assert(sections.name.found);
  assert(sections.name.content === 'my-skill', `Got: ${sections.name.content}`);
});

test('extracts description with alternative heading', () => {
  const sections = extractSections('## Overview\nThis is a long overview text.\n## Usage\n```bash\nrun\n```');
  assert(sections.description.found);
  assert(sections.description.content.includes('long overview'));
});

test('extracts usage section', () => {
  const sections = extractSections('## Usage\n```bash\nskillguard SKILL.md\n```\n## Parameters\n- `--json`');
  assert(sections.usage.found);
  assert(sections.usage.content.includes('```'));
  assert(sections.parameters.found);
});

test('returns found:false for missing sections', () => {
  const sections = extractSections('# Hello\nWorld');
  assert(!sections.name.found);
  assert(!sections.description.found);
});

console.log('\nvalidateMarkdown — scoring');
test('grade A for complete skill', () => {
  const fp = writeFile('perfect.md', `## Name
skillguard

## Description
Validates AI skill definition files for structure and completeness scoring.

## Usage
\`\`\`bash
skillguard check SKILL.md
\`\`\`

## Parameters
- \`--json\` — JSON output

## Behavior
- Always validate

## Constraints
- Markdown only

## Dependencies
- Node.js 18+

## Examples
\`\`\`bash
skillguard check SKILL.md --format json
\`\`\`

## Errors
Exits 1 on failure.
`);
  const r = validateMarkdown(fp);
  assert(r.grade === 'A', `Expected A, got ${r.grade} (${r.points})`);
  assert(r.errors.length === 0);
});

test('grade F for empty file', () => {
  const fp = writeFile('empty.md', '');
  const r = validateMarkdown(fp);
  assert(r.grade === 'F');
  assert(r.errors.length >= 3, `Expected 3+ errors, got ${r.errors.length}`);
});

test('grade C/B for minimal but valid', () => {
  const fp = writeFile('minimal.md', `## Name
my-tool

## Description
A minimal skill description that meets the twenty char minimum.

## Usage
\`\`\`bash
my-tool
\`\`\`
`);
  const r = validateMarkdown(fp);
  assert(r.points >= 50, `Expected >= 50, got ${r.points}`);
  assert(r.errors.length === 0);
});

test('warns on short description', () => {
  const fp = writeFile('short.md', `## Name
tool

## Description
Too short.

## Usage
\`\`\`bash
tool
\`\`\`
`);
  const r = validateMarkdown(fp);
  assert(r.errors.some(e => e.field === 'description'), 'Should flag short description');
});

test('warns on usage without code', () => {
  const fp = writeFile('nocode.md', `## Name
tool

## Description
A tool with proper description for testing the validation system.

## Usage
Just run it.
`);
  const r = validateMarkdown(fp);
  assert(r.errors.some(e => e.field === 'usage'), 'Should flag usage without code');
});

test('warns on short name', () => {
  const fp = writeFile('shortname.md', `## Name
x

## Description
A tool description long enough to pass validation requirements.

## Usage
\`\`\`bash
x
\`\`\`
`);
  const r = validateMarkdown(fp);
  assert(r.errors.some(e => e.field === 'name'), 'Should flag short name');
});

test('returns file stats', () => {
  const fp = writeFile('stats.md', `## Name
stats-tool

## Description
A tool for testing that file statistics work correctly in the output.

## Usage
\`\`\`bash
stats-tool
\`\`\`
`);
  const r = validateMarkdown(fp);
  assert(r.lineCount > 0);
  assert(r.headingCount > 0);
  assert(r.byteSize > 0);
});

test('rejects non-md files', () => {
  const fp = writeFile('skill.txt', 'hello');
  const r = validateMarkdown(fp);
  assert(r.error !== undefined);
});

test('missing file returns error', () => {
  const r = validateMarkdown('/nonexistent/path.md');
  assert(r.error !== undefined);
});

console.log('\nCLI markdown support');
test('CLI validates .md files', () => {
  const fp = writeFile('cli-test.md', `## Name
cli-tool

## Description
A CLI tool for testing markdown validation support in skillguard.

## Usage
\`\`\`bash
cli-tool run
\`\`\`
`);
  const r = runCLI(`check ${fp}`);
  assert(r.stdout.includes('checking'), `Should show checking: ${r.stdout}`);
});

test('CLI --format json for .md', () => {
  const fp = writeFile('json-md.md', `## Name
json-tool

## Description
A tool for testing JSON output with markdown skill file validation.

## Usage
\`\`\`bash
json-tool
\`\`\`
`);
  const r = runCLI(`check ${fp} --format json`);
  const parsed = JSON.parse(r.stdout);
  assert(parsed.results !== undefined);
  assert(parsed.overall !== undefined);
  assert(parsed.results[0].grade !== undefined);
});

test('CLI --min-score fails on bad md', () => {
  const fp = writeFile('bad.md', '# nothing useful here');
  const r = runCLI(`check ${fp} --min-score B`);
  assert(r.exitCode === 1, `Expected exit 1, got ${r.exitCode}`);
});

test('CLI --verbose shows all findings', () => {
  const fp = writeFile('verbose.md', `## Name
verbose-tool

## Description
A verbose tool for testing all the output flags and their behavior.

## Usage
\`\`\`bash
verbose-tool
\`\`\`

## Parameters
- \`--flag\` — A flag
`);
  const r = runCLI(`check ${fp} --verbose`);
  assert(r.stdout.includes('ℹ️') || r.stdout.includes('Optional') || r.stdout.includes('Parameters'));
});

// Cleanup
fs.rmSync(TMP, { recursive: true });

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
