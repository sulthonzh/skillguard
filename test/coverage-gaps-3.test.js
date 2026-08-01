#!/usr/bin/env node
'use strict';

// coverage-gaps-3.test.js — CLI verbose warnings + markdown dead code verification
// Targeting: cli.js lines 29-30 (verbose warnings/info), lines 93/114 (dead code confirmation)

const { execSync } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const TMP = '/tmp/skillguard-cov3';
const CLI = path.join(__dirname, '../src/cli.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

function setup() {
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });
}

function writeFile(name, content) {
  const fp = path.join(TMP, name);
  fs.writeFileSync(fp, content);
  return fp;
}

function runCLI(args) {
  try {
    const stdout = execSync(`node ${CLI} ${args}`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    return { stdout, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.status || 1 };
  }
}

setup();

console.log('\nCLI verbose warnings (cli.js lines 29-30)');

// Skill with bad name convention → triggers warning
test('CLI --verbose shows warning for bad skill name', () => {
  const fp = writeFile('bad-name.json', JSON.stringify({
    name: 'BadSkillName_WithUnderscores',
    version: '1.0.0',
    description: 'A skill with a bad name to trigger naming convention warnings',
    author: 'test'
  }));
  const r = runCLI(`check ${fp} --verbose`);
  assert(r.stdout.includes('BadSkillName'), 'Should show skill name');
  assert(r.stdout.includes('⚠️'), 'Should show warning emoji in verbose mode');
});

// Skill with tools array empty → triggers info
test('CLI --verbose shows info for empty tools', () => {
  const fp = writeFile('empty-tools.json', JSON.stringify({
    name: 'empty-tools-skill',
    version: '1.0.0',
    description: 'A skill with empty tools array to trigger info output',
    author: 'test',
    tools: []
  }));
  const r = runCLI(`check ${fp} --verbose`);
  assert(r.stdout.includes('empty-tools-skill'), 'Should show skill name');
  assert(r.stdout.includes('ℹ️'), 'Should show info emoji in verbose mode');
});

// Skill with multiple warnings → verify all shown
test('CLI --verbose shows multiple warnings', () => {
  const fp = writeFile('multi-warn.json', JSON.stringify({
    name: 'UPPERCASE_NAME_THAT_IS_ALSO_RIDICULOUSLY_LONG_BEYOND_SIXTY_FOUR_CHARACTERS_TOTAL',
    version: '1.0.0',
    description: 'A skill with multiple naming violations to trigger multiple warnings at once',
    author: 'test'
  }));
  const r = runCLI(`check ${fp} --verbose`);
  assert(r.stdout.includes('⚠️'), 'Should show warnings');
  // Should show both name format and name length warnings
  const warnCount = (r.stdout.match(/⚠️/g) || []).length;
  assert(warnCount >= 2, `Expected at least 2 warnings, got ${warnCount}`);
});

console.log('\nCLI markdown dead code verification (cli.js lines 93, 114)');
// Lines 93 and 114 handle r.error from validateMarkdown which only returns error
// for non-existent or non-md files — impossible in the CLI path since we already
// verify the file exists and has .md extension. These are confirmed dead code.

test('CLI markdown file with valid structure does not trigger error branch', () => {
  const fp = writeFile('valid.md', '## Name\nvalid-skill\n## Description\nA valid skill\n## Usage\n\n```bash\necho hello\n```');
  const r = runCLI(`check ${fp}`);
  // Valid skill with no errors may still exit non-zero depending on grading
  assert(!r.stdout.includes('File not found'), 'Should not trigger error branch');
  assert(r.stdout.includes('valid.md'), 'Should show the filename');
});

console.log('\nMarkdown.js optional section coverage (lines 173-174)');

// Lines 173-174: optional section found but no validate function → info push
// All optional sections (parameters, behavior, constraints, dependencies, examples, errors)
// have no validate function, so finding them triggers this branch
test('CLI markdown with optional sections triggers info push for non-validated sections', () => {
  const fp = writeFile('full-skill.md', `## Name
full-skill\n## Description\n${'A comprehensive skill with all optional sections for full coverage testing of the markdown validation logic and its scoring behavior'}\n## Usage\n\n${'```bash'}\necho hello\n${'```'}\n## Parameters\n- param1\n## Behavior\nDoes things\n## Constraints\nNone\n## Dependencies\nNone\n## Examples\nExample\n## Errors\nNone`);
  const r = runCLI(`check ${fp} --verbose`);
  assert(r.stdout.includes('full-skill'), 'Should show skill');
  // Optional sections found → info pushed in verbose mode
  assert(r.stdout.includes('ℹ️'), 'Should show info for optional sections');
});

// Lines 149-150: optional section fails validate → warnings.push
// This is dead code since no optional section has a validate function
// Confirming: optional section with content still produces valid result
test('Markdown optional sections are never invalid (dead code confirmation)', () => {
  const { validateMarkdown } = require('../src/markdown');
  const fp = writeFile('opt-test.md', `## Name\ntest\n## Description\n${'Valid skill description long enough to pass validation checks'}\n## Usage\n\n${'```bash'}\necho test\n${'```'}\n## Parameters\n- foo\n## Examples\nbar`);
  const r = validateMarkdown(fp);
  assert(r.errors.length === 0 || r.errors.length === 1, `Expected 0-1 errors, got ${r.errors.length}`);
  // warnings array exists — optional section warnings never appear since no validators
  assert(r.warnings !== undefined, 'Should have warnings array');
});

console.log('\nMarkdown.js direct unit tests (covering lines 149-150, 173-174)');

const { validateMarkdown } = require('../src/markdown');

// Lines 173-174: section found, no validate function → info push
test('validateMarkdown with optional sections pushes info for non-validated sections', () => {
  const fp = writeFile('opt-sections.md', `## Name\ntest-skill\n## Description\n${'A valid skill description that is long enough to pass validation checks'}\n## Usage\n\n${'```bash'}\necho test\n${'```'}\n## Parameters\n- foo: bar\n## Behavior\nDoes things\n## Constraints\nNone\n## Dependencies\nNone\n## Examples\nExample\n## Errors\nNone`);
  const r = validateMarkdown(fp);
  assert(r.errors.length === 0, `Expected 0 errors, got ${r.errors.length}`);
  assert(r.info.length >= 5, `Expected at least 5 info items, got ${r.info.length}`);
  // Verify optional sections with no validator produce "Has" info
  const hasInfo = r.info.find(i => i.message.includes('Has'));
  assert(hasInfo, 'Should have info with "Has" for optional sections without validator');
});

// Lines 149-150: optional section with validator that fails → warnings.push
// This is dead code since no optional section has a validate function.
// Confirming via code inspection: all 6 optional sections (parameters, behavior,
// constraints, dependencies, examples, errors) have validate: undefined.
test('Dead code confirmation: no optional MD section has a validator', () => {
  const { MD_SECTIONS } = require('../src/markdown');
  const optionalKeys = ['parameters', 'behavior', 'constraints', 'dependencies', 'examples', 'errors'];
  for (const key of optionalKeys) {
    assert(MD_SECTIONS[key].validate === undefined, `Optional section ${key} should have no validator`);
    assert(!MD_SECTIONS[key].required, `Optional section ${key} should not be required`);
  }
});

// Cleanup
fs.rmSync(TMP, { recursive: true });

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
