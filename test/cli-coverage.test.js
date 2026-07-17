#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const TMP = '/tmp/skillguard-cli-test';
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

function runCLI(args) {
  try {
    return { stdout: execSync(`node ${CLI} ${args}`, { encoding: 'utf-8', timeout: 5000 }), exitCode: 0 };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', exitCode: e.status || 1 };
  }
}

function writeFile(name, content) {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, content);
  return p;
}

setup();

console.log('CLI help command');
test('CLI shows help with no args', () => {
  const r = runCLI('');
  assert(r.stdout.includes('skillguard v') && r.stdout.includes('Usage:'));
});

test('CLI --help shows usage', () => {
  const r = runCLI('--help');
  assert(r.stdout.includes('Usage:') && r.stdout.includes('skillguard check'));
});

test('CLI help shows usage', () => {
  const r = runCLI('help');
  assert(r.stdout.includes('Usage:') && r.stdout.includes('--verbose'));
});

console.log('\nCLI version command');
test('CLI version shows version', () => {
  const r = runCLI('version');
  const pkg = require('../package.json');
  assert(r.stdout.trim() === pkg.version);
});

test('CLI --version shows version', () => {
  const r = runCLI('--version');
  const pkg = require('../package.json');
  assert(r.stdout.trim() === pkg.version);
});

test('CLI -V shows version', () => {
  const r = runCLI('-V');
  const pkg = require('../package.json');
  assert(r.stdout.trim() === pkg.version);
});

console.log('\nCLI error handling');
test('CLI unknown command exits with error', () => {
  const r = runCLI('unknown-cmd');
  assert(r.exitCode === 1);
  assert(r.stderr.includes('Unknown command'));
});

test('CLI check without target exits with error', () => {
  const r = runCLI('check');
  assert(r.exitCode === 1);
  assert(r.stderr.includes('Specify a file or directory'));
});

console.log('\nCLI JSON/YAML file validation');
test('CLI validates good JSON skill file', () => {
  const fp = writeFile('good.json', JSON.stringify({
    name: 'test-skill',
    version: '1.0.0',
    description: 'A test skill for validation'
  }));
  const r = runCLI(`check ${fp}`);
  assert(r.stdout.includes('test-skill'));
  assert(r.stdout.includes('A'));
});

test('CLI validates bad JSON skill file', () => {
  const fp = writeFile('bad.json', JSON.stringify({}));
  const r = runCLI(`check ${fp}`);
  assert(r.exitCode === 1);
  assert(r.stdout.includes('F'));
});

test('CLI validates YAML skill file', () => {
  const fp = writeFile('skill.yaml', `name: yaml-skill
version: 1.0.0
description: A YAML skill`);
  const r = runCLI(`check ${fp}`);
  assert(r.stdout.includes('yaml-skill'));
  assert(r.stdout.includes('A'));
});

console.log('\nCLI directory validation');
test('CLI validates directory of JSON skills', () => {
  const dir = path.join(TMP, 'skills');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ name: 'skill-a', version: '1.0.0', description: 'First' }));
  fs.writeFileSync(path.join(dir, 'b.json'), JSON.stringify({ name: 'skill-b', version: '1.0.0', description: 'Second' }));
  const r = runCLI(`check ${dir}`);
  assert(r.stdout.includes('2 skill(s)'));
});

test('CLI validates directory with mixed extensions', () => {
  const dir = path.join(TMP, 'mixed');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'skill.json'), JSON.stringify({ name: 'json-skill', version: '1.0.0', description: 'JSON' }));
  fs.writeFileSync(path.join(dir, 'skill.yaml'), `name: yaml-skill\nversion: 1.0.0\ndescription: YAML`);
  const r = runCLI(`check ${dir}`);
  assert(r.stdout.includes('2 skill(s)'));
});

test('CLI ignores non-skill files in directory', () => {
  const dir = path.join(TMP, 'ignore');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'skill.json'), JSON.stringify({ name: 'only-skill', version: '1.0.0', description: 'One' }));
  fs.writeFileSync(path.join(dir, 'readme.md'), '# README');
  fs.writeFileSync(path.join(dir, 'data.txt'), 'stuff');
  const r = runCLI(`check ${dir}`);
  assert(r.stdout.includes('1 skill(s)'));
});

console.log('\nCLI markdown directory support');
test('CLI validates directory of markdown skills', () => {
  const dir = path.join(TMP, 'md-skills');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'a.md'), `## Name\nmd-a\n## Description\nFirst markdown\n## Usage\n\`\`\`bash\necho\n\`\`\``);
  fs.writeFileSync(path.join(dir, 'b.md'), `## Name\nmd-b\n## Description\nSecond markdown\n## Usage\n\`\`\`bash\necho\n\`\`\``);
  const r = runCLI(`check ${dir}`);
  assert(r.stdout.includes('2 skill(s)'));
});

test('CLI handles markdown errors in directory', () => {
  const dir = path.join(TMP, 'bad-md');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'bad.md'), '# Nothing');
  const r = runCLI(`check ${dir}`);
  assert(r.exitCode === 1);
});

console.log('\nCLI output formats');
test('CLI --format json outputs valid JSON', () => {
  const fp = writeFile('json-fmt.json', JSON.stringify({ name: 'fmt', version: '1.0.0', description: 'Format test' }));
  const r = runCLI(`check ${fp} --format json`);
  const parsed = JSON.parse(r.stdout);
  assert(parsed.results !== undefined);
  assert(parsed.overall !== undefined);
  assert(Array.isArray(parsed.results));
});

test('CLI --format json with directory', () => {
  const dir = path.join(TMP, 'json-dir');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'skill.json'), JSON.stringify({ name: 'skill', version: '1.0.0', description: 'Test' }));
  const r = runCLI(`check ${dir} --format json`);
  const parsed = JSON.parse(r.stdout);
  assert(parsed.results.length === 1);
});

console.log('\nCLI verbose flag');
test('CLI --verbose shows warnings and info', () => {
  const fp = writeFile('verbose.json', JSON.stringify({
    name: 'verbose-skill',
    version: '1.0.0',
    description: 'A skill for testing verbose output which should be at least twenty chars',
    tools: []
  }));
  const r = runCLI(`check ${fp} --verbose`);
  assert(r.stdout.includes('⚠️') || r.stdout.includes('ℹ️'));
});

test('CLI without verbose hides info for good skills', () => {
  const fp = writeFile('no-verbose.json', JSON.stringify({
    name: 'no-verbose',
    version: '1.0.0',
    description: 'A good skill description'
  }));
  const r = runCLI(`check ${fp}`);
  // Should not show ℹ️ for good skill in non-verbose mode
  const hasInfo = r.stdout.includes('ℹ️');
  assert(!hasInfo || r.stdout.includes('errors') || r.stdout.includes('warnings'));
});

console.log('\nCLI --min-score threshold');
test('CLI --min-score B passes for A grade', () => {
  const fp = writeFile('a-grade.json', JSON.stringify({ name: 'a-grade', version: '1.0.0', description: 'Perfect' }));
  const r = runCLI(`check ${fp} --min-score B`);
  assert(r.exitCode === 0);
});

test('CLI --min-score A fails for B grade', () => {
  const fp = writeFile('b-grade.json', JSON.stringify({ name: 'b-grade', version: '1.0.0', description: 'OK' }));
  const r = runCLI(`check ${fp} --min-score A`);
  assert(r.exitCode === 1);
  assert(r.stderr.includes('below threshold'));
});

test('CLI --min-score fails for F grade', () => {
  const fp = writeFile('f-grade.json', JSON.stringify({}));
  const r = runCLI(`check ${fp} --min-score C`);
  assert(r.exitCode === 1);
  assert(r.stderr.includes('below threshold'));
});

console.log('\nCLI combined flags');
test('CLI with all flags works', () => {
  const fp = writeFile('all-flags.json', JSON.stringify({
    name: 'all-flags',
    version: '1.0.0',
    description: 'Testing all CLI flags together'
  }));
  const r = runCLI(`check ${fp} --format json --verbose --min-score B`);
  const parsed = JSON.parse(r.stdout);
  assert(parsed.results !== undefined);
  assert(parsed.overall.grade !== undefined);
});

console.log('\nCLI markdown file validation (already covered in markdown.test.js, but confirming CLI path)');
test('CLI validates .md file', () => {
  const fp = writeFile('cli-md.md', `## Name\ncli-md\n## Description\nCLI markdown test\n## Usage\n\`\`\`bash\ntest\n\`\`\``);
  const r = runCLI(`check ${fp}`);
  assert(r.stdout.includes('cli-md'));
});

test('CLI .md file with --format json', () => {
  const fp = writeFile('json-md.md', `## Name\njson-md\n## Description\nJSON MD\n## Usage\n\`\`\`bash\ntest\n\`\`\``);
  const r = runCLI(`check ${fp} --format json`);
  const parsed = JSON.parse(r.stdout);
  assert(parsed.results[0].file.endsWith('json-md.md'));
});

test('CLI .md file with errors and --format json', () => {
  const fp = writeFile('bad-cli.md', 'invalid');
  const r = runCLI(`check ${fp} --format json`);
  const parsed = JSON.parse(r.stdout);
  assert(parsed.results[0].errors.length > 0);
});

// Cleanup
fs.rmSync(TMP, { recursive: true });

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);