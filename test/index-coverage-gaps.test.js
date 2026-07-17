#!/usr/bin/env node
'use strict';

const { validate, validateDir, parseFile, validateSkill, score } = require('../src/index');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const TMP = '/tmp/skillguard-index-gaps';
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
  const p = path.join(TMP, name);
  fs.writeFileSync(p, content);
  return p;
}

setup();

console.log('parseFile — extensionless file (lines 21-27 JSON fallback)');
test('parses extensionless file as JSON', () => {
  const fp = writeFile('extensionless', JSON.stringify({ name: 'no-ext', version: '1.0.0', description: 'Test' }));
  const parsed = parseFile(fp);
  assert.strictEqual(parsed.name, 'no-ext');
});

test('falls back to YAML parser for extensionless invalid JSON', () => {
  const fp = writeFile('ext-yaml', `name: ext-yaml
version: 1.0.0
description: Extensionless YAML`);
  const parsed = parseFile(fp);
  assert.strictEqual(parsed.name, 'ext-yaml');
});

test('extensionless file with both JSON and YAML-like content tries JSON first', () => {
  const fp = writeFile('ext-json', '{ "name": "ext-json", "version": "1.0.0", "description": "JSON" }');
  const parsed = parseFile(fp);
  assert.strictEqual(parsed.name, 'ext-json');
});

console.log('\nparseSimpleYaml — quoted array items (line 47)');
test('parses YAML array with double-quoted strings', () => {
  const fp = writeFile('quoted-array.yaml', `name: quoted-array
version: 1.0.0
description: Test
tools:
- "tool-one"
- "tool-two"`);
  const parsed = parseFile(fp);
  assert.deepStrictEqual(parsed.tools, ['tool-one', 'tool-two']);
});

test('parses YAML array with single-quoted strings', () => {
  const fp = writeFile('single-quoted.yaml', `name: single-quoted
version: 1.0.0
description: Test
tools:
- 'tool-a'
- 'tool-b'`);
  const parsed = parseFile(fp);
  assert.deepStrictEqual(parsed.tools, ['tool-a', 'tool-b']);
});

test('parses mixed quoted and unquoted array items', () => {
  const fp = writeFile('mixed-quoted.yaml', `name: mixed-quoted
version: 1.0.0
description: Test
list:
- plain
- "quoted"
- 'single'`);
  const parsed = parseFile(fp);
  assert.deepStrictEqual(parsed.list, ['plain', 'quoted', 'single']);
});

console.log('\nvalidateSkill — output schema missing type warning (lines 217-222)');
test('warns when output schema missing type field', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill with output schema but no type',
    output: { properties: { result: { type: 'string' } } }
  });
  const warn = result.warnings.find(w => w.field === 'output.type');
  assert.ok(warn);
  assert(warn.message.includes('type'));
});

test('does not warn when output schema has type field', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill with complete output schema',
    output: { type: 'object', properties: { result: { type: 'string' } } }
  });
  const warn = result.warnings.find(w => w.field === 'output.type');
  assert.ok(!warn);
});

test('warns on invalid output schema AND missing type', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill',
    output: []
  });
  const outputErr = result.errors.find(e => e.field === 'output');
  assert.ok(outputErr);
});

console.log('\nvalidate — integration tests for uncovered code paths');
test('validate returns file path in result', () => {
  const fp = writeFile('path-test.json', JSON.stringify({ name: 'path-test', version: '1.0.0', description: 'Test' }));
  const result = validate(fp);
  assert(result.filePath === path.resolve(fp));
});

test('validate returns skill object in result', () => {
  const fp = writeFile('skill-obj.json', JSON.stringify({ name: 'skill-obj', version: '1.0.0', description: 'Test' }));
  const result = validate(fp);
  assert.ok(result.skill);
  assert.strictEqual(result.skill.name, 'skill-obj');
});

test('validate returns grade and points', () => {
  const fp = writeFile('grade-test.json', JSON.stringify({ name: 'grade-test', version: '1.0.0', description: 'Test' }));
  const result = validate(fp);
  assert(result.grade !== undefined);
  assert(result.points !== undefined);
  assert(result.max === 100);
});

console.log('\nparseFile — edge cases');
test('parses YAML with boolean array values', () => {
  const fp = writeFile('bool-array.yaml', `name: bool-array
version: 1.0.0
description: Test
flags:
- true
- false
- true`);
  const parsed = parseFile(fp);
  assert.deepStrictEqual(parsed.flags, [true, false, true]);
});

test('parses YAML with number array values', () => {
  const fp = writeFile('num-array.yaml', `name: num-array
version: 1.0.0
description: Test
nums:
- 1
- 2.5
- -3`);
  const parsed = parseFile(fp);
  assert.deepStrictEqual(parsed.nums, [1, 2.5, -3]);
});

test('parses YAML with null array value', () => {
  const fp = writeFile('null-array.yaml', `name: null-array
version: 1.0.0
description: Test
vals:
- one
- null
- three`);
  const parsed = parseFile(fp);
  assert.deepStrictEqual(parsed.vals, ['one', null, 'three']);
});

console.log('\nparseSimpleYaml — multiline array parsing');
test('parses multiline YAML array after block marker', () => {
  const fp = writeFile('multiline-array.yaml', `name: multiline-array
version: 1.0.0
description: Test
tools:
- tool-one
- tool-two
- tool-three`);
  const parsed = parseFile(fp);
  assert.deepStrictEqual(parsed.tools, ['tool-one', 'tool-two', 'tool-three']);
});

test('handles empty array in YAML', () => {
  const fp = writeFile('empty-array.yaml', `name: empty-array
version: 1.0.0
description: Test
tools:`);
  const parsed = parseFile(fp);
  assert(Array.isArray(parsed.tools));
});

test('handles single item array in YAML', () => {
  const fp = writeFile('single-array.yaml', `name: single-array
version: 1.0.0
description: Test
tools:
- only-tool`);
  const parsed = parseFile(fp);
  assert.deepStrictEqual(parsed.tools, ['only-tool']);
});

console.log('\nvalidateSkill — config edge cases');
test('validates config with number zero (valid timeout)', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill',
    config: { timeout: 0 }
  });
  const warn = result.warnings.find(w => w.field === 'config.timeout');
  assert.ok(warn);
});

test('validates config with large positive timeout (valid)', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill',
    config: { timeout: 999999 }
  });
  const warn = result.warnings.find(w => w.field === 'config.timeout');
  assert.ok(!warn);
});

test('validates config with zero retries (valid)', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill',
    config: { retries: 0 }
  });
  const warn = result.warnings.find(w => w.field === 'config.retries');
  assert.ok(!warn);
});

test('validates config with large retries (valid)', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill',
    config: { retries: 1000 }
  });
  const warn = result.warnings.find(w => w.field === 'config.retries');
  assert.ok(!warn);
});

console.log('\nvalidateSkill — additional schema edge cases');
test('handles input schema with type only', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill',
    input: { type: 'string' }
  });
  const warn = result.warnings.find(w => w.field === 'input.type');
  assert.ok(!warn);
});

test('handles output schema with type only', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill',
    output: { type: 'object' }
  });
  const warn = result.warnings.find(w => w.field === 'output.type');
  assert.ok(!warn);
});

test('handles input schema as empty object', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill',
    input: {}
  });
  const warn = result.warnings.find(w => w.field === 'input.type');
  assert.ok(warn);
});

test('handles output schema as empty object', () => {
  const result = validateSkill({
    name: 'skill',
    version: '1.0.0',
    description: 'A skill',
    output: {}
  });
  const warn = result.warnings.find(w => w.field === 'output.type');
  assert.ok(warn);
});

console.log('\nparseSimpleYaml — edge cases for uncovered lines (55, 62, 93)');
test('parses YAML without colon (line 62)', () => {
  const fp = writeFile('no-colon.yaml', `name: no-colon
version: 1.0.0
description: Test`);
  const parsed = parseFile(fp);
  assert.strictEqual(parsed.name, 'no-colon');
});

test('parses YAML value that is just whitespace (line 93)', () => {
  const fp = writeFile('whitespace-value.yaml', `name: ws-value
version: 1.0.0
description: Test
tool:   `);
  const parsed = parseFile(fp);
  // Whitespace value is parsed as empty array
  assert.ok(Array.isArray(parsed.tool) && parsed.tool.length === 0);
});

test('parses YAML boolean array value false (line 93)', () => {
  const fp = writeFile('bool-false.yaml', `name: bool-false
version: 1.0.0
description: Test
flags:
- true
- false`);
  const parsed = parseFile(fp);
  assert.deepStrictEqual(parsed.flags, [true, false]);
});

test('parses YAML number with decimal (line 93)', () => {
  const fp = writeFile('decimal.yaml', `name: decimal
version: 1.0.0
description: Test
num: 3.14`);
  const parsed = parseFile(fp);
  assert.strictEqual(parsed.num, 3.14);
});

console.log('\ncheckCircular — cycle detection (line 298)');
test('detects circular dependency between skills', () => {
  const dir = path.join(TMP, 'circular-test');
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  fs.mkdirSync(dir, { recursive: true });
  const fp1 = path.join(dir, 'skill-a.json');
  const fp2 = path.join(dir, 'skill-b.json');
  fs.writeFileSync(fp1, JSON.stringify({ name: 'skill-a', version: '1.0.0', description: 'Test', dependencies: ['skill-b'] }));
  fs.writeFileSync(fp2, JSON.stringify({ name: 'skill-b', version: '1.0.0', description: 'Test', dependencies: ['skill-a'] }));
  const results = validateDir(dir);
  const cycErr = results.results[0].errors.find(e => e.field === 'dependencies');
  assert.ok(cycErr);
  assert.ok(cycErr.message.includes('Circular'));
});

test('detects deep circular dependency', () => {
  const dir = path.join(TMP, 'deep-circular-test');
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  fs.mkdirSync(dir, { recursive: true });
  const fp1 = path.join(dir, 'skill-a.json');
  const fp2 = path.join(dir, 'skill-b.json');
  const fp3 = path.join(dir, 'skill-c.json');
  fs.writeFileSync(fp1, JSON.stringify({ name: 'skill-a', version: '1.0.0', description: 'Test', dependencies: ['skill-b'] }));
  fs.writeFileSync(fp2, JSON.stringify({ name: 'skill-b', version: '1.0.0', description: 'Test', dependencies: ['skill-c'] }));
  fs.writeFileSync(fp3, JSON.stringify({ name: 'skill-c', version: '1.0.0', description: 'Test', dependencies: ['skill-a'] }));
  const results = validateDir(dir);
  const cycErr = results.results[0].errors.find(e => e.field === 'dependencies');
  assert.ok(cycErr);
});

test('handles skill with no circular deps gracefully', () => {
  const dir = path.join(TMP, 'no-circular-test');
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  fs.mkdirSync(dir, { recursive: true });
  const fp1 = path.join(dir, 'skill-a.json');
  const fp2 = path.join(dir, 'skill-b.json');
  const fp3 = path.join(dir, 'skill-c.json');
  fs.writeFileSync(fp1, JSON.stringify({ name: 'skill-a', version: '1.0.0', description: 'Test', dependencies: ['skill-b'] }));
  fs.writeFileSync(fp2, JSON.stringify({ name: 'skill-b', version: '1.0.0', description: 'Test', dependencies: ['skill-c'] }));
  fs.writeFileSync(fp3, JSON.stringify({ name: 'skill-c', version: '1.0.0', description: 'Test', dependencies: ['skill-d'] }));
  const results = validateDir(dir);
  const cycErr = results.results[0].errors.find(e => e.field === 'dependencies' && e.message.includes('Circular'));
  assert.ok(!cycErr);
});

console.log('\nscore — F grade edge case (line 356)');
test('assigns F grade when score < 60 (3 errors)', () => {
  const result = score({ errors: [{ field: '-', message: 'error', severity: 'error' }, { field: '-', message: 'error', severity: 'error' }, { field: '-', message: 'error', severity: 'error' }], warnings: [], info: [] });
  assert.strictEqual(result.grade, 'F');
});

test('assigns grade at threshold boundaries', () => {
  assert.strictEqual(score({ errors: [], warnings: [], info: [] }).grade, 'A');
  assert.strictEqual(score({ errors: [], warnings: [{ field: '-', message: 'warn', severity: 'warning' }], info: [] }).grade, 'A');
  assert.strictEqual(score({ errors: [{ field: '-', message: 'error', severity: 'error' }], warnings: [], info: [] }).grade, 'B');
  assert.strictEqual(score({ errors: [{ field: '-', message: 'error', severity: 'error' }, { field: '-', message: 'error', severity: 'error' }], warnings: [], info: [] }).grade, 'D');
  assert.strictEqual(score({ errors: [{ field: '-', message: 'error', severity: 'error' }, { field: '-', message: 'error', severity: 'error' }, { field: '-', message: 'error', severity: 'error' }], warnings: [], info: [] }).grade, 'F');
});

// Cleanup
fs.rmSync(TMP, { recursive: true });

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
