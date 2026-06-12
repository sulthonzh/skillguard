#!/usr/bin/env node
'use strict';

const {
  validate, validateDir, validateSkill, score,
  parseFile, checkDuplicates, checkCircular
} = require('../src/index');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const TMP = '/tmp/skillguard-test';
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

function cleanup() {
  fs.rmSync(TMP, { recursive: true });
}

// --- Tests ---
setup();

console.log('parseFile');
test('parses JSON skill file', () => {
  const skill = { name: 'test', version: '1.0.0', description: 'A test skill' };
  const fp = path.join(TMP, 'skill.json');
  fs.writeFileSync(fp, JSON.stringify(skill));
  const parsed = parseFile(fp);
  assert.strictEqual(parsed.name, 'test');
  assert.strictEqual(parsed.version, '1.0.0');
});

test('parses YAML skill file', () => {
  const yaml = 'name: yaml-skill\nversion: 1.0.0\ndescription: A YAML skill\ntools:\n- tool-a\n- tool-b\n';
  const fp = path.join(TMP, 'skill.yaml');
  fs.writeFileSync(fp, yaml);
  const parsed = parseFile(fp);
  assert.strictEqual(parsed.name, 'yaml-skill');
  assert.deepStrictEqual(parsed.tools, ['tool-a', 'tool-b']);
});

test('throws on invalid JSON', () => {
  const fp = path.join(TMP, 'bad.json');
  fs.writeFileSync(fp, '{invalid}');
  assert.throws(() => parseFile(fp));
});

console.log('\nvalidateSkill');
test('catches missing required fields', () => {
  const result = validateSkill({});
  assert.strictEqual(result.errors.length, 3); // name, version, description
});

test('passes valid skill', () => {
  const result = validateSkill({
    name: 'my-skill', version: '1.0.0', description: 'Does something useful',
    tools: ['tool-a'], input: { type: 'object' }, output: { type: 'object' }
  });
  assert.strictEqual(result.errors.length, 0);
});

test('warns on bad name format', () => {
  const result = validateSkill({ name: 'MySkill', version: '1.0.0', description: 'Test skill' });
  const nameWarn = result.warnings.find(w => w.field === 'name');
  assert.ok(nameWarn);
});

test('warns on short description', () => {
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: 'hi' });
  const descWarn = result.warnings.find(w => w.field === 'description');
  assert.ok(descWarn);
});

test('catches bad version', () => {
  const result = validateSkill({ name: 'skill', version: 'abc', description: 'A valid desc' });
  const verErr = result.errors.find(e => e.field === 'version');
  assert.ok(verErr);
});

test('catches non-array tools', () => {
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: 'A skill', tools: 'not-array' });
  const toolErr = result.errors.find(e => e.field === 'tools');
  assert.ok(toolErr);
});

test('catches empty tool string', () => {
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: 'A skill', tools: [''] });
  const toolErr = result.errors.find(e => e.field === 'tools[0]');
  assert.ok(toolErr);
});

test('warns on empty tools array', () => {
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: 'A skill', tools: [] });
  const info = result.info.find(i => i.field === 'tools');
  assert.ok(info);
});

test('catches invalid input schema', () => {
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: 'A skill', input: 'bad' });
  const inputErr = result.errors.find(e => e.field === 'input');
  assert.ok(inputErr);
});

test('warns on missing input type', () => {
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: 'A skill', input: {} });
  const warn = result.warnings.find(w => w.field === 'input.type');
  assert.ok(warn);
});

test('catches invalid output schema', () => {
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: 'A skill', output: [] });
  const outputErr = result.errors.find(e => e.field === 'output');
  assert.ok(outputErr);
});

test('catches invalid config', () => {
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: 'A skill', config: 'bad' });
  const cfgErr = result.errors.find(e => e.field === 'config');
  assert.ok(cfgErr);
});

test('warns on negative timeout', () => {
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: 'A skill', config: { timeout: -1 } });
  const warn = result.warnings.find(w => w.field === 'config.timeout');
  assert.ok(warn);
});

test('warns on negative retries', () => {
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: 'A skill', config: { retries: -5 } });
  const warn = result.warnings.find(w => w.field === 'config.retries');
  assert.ok(warn);
});

test('warns on long name', () => {
  const longName = 'a'.repeat(65);
  const result = validateSkill({ name: longName, version: '1.0.0', description: 'A skill' });
  const warn = result.warnings.find(w => w.field === 'name');
  assert.ok(warn);
});

test('warns on long description', () => {
  const longDesc = 'x'.repeat(501);
  const result = validateSkill({ name: 'skill', version: '1.0.0', description: longDesc });
  const warn = result.warnings.find(w => w.field === 'description');
  assert.ok(warn);
});

console.log('\nscore');
test('scores perfect skill as A', () => {
  const result = score({ errors: [], warnings: [], info: [] });
  assert.strictEqual(result.grade, 'A');
  assert.strictEqual(result.points, 100);
});

test('scores errors correctly', () => {
  const result = score({ errors: [{}, {}], warnings: [], info: [] });
  assert.strictEqual(result.grade, 'D');
  assert.strictEqual(result.points, 60);
});

test('scores warnings correctly', () => {
  const result = score({ errors: [], warnings: [{}, {}, {}], info: [] });
  assert.strictEqual(result.points, 85);
});

test('never goes below 0', () => {
  const result = score({ errors: Array(20).fill({}), warnings: [], info: [] });
  assert.strictEqual(result.points, 0);
  assert.strictEqual(result.grade, 'F');
});

console.log('\ncheckDuplicates');
test('detects duplicate names', () => {
  const skills = [
    { skill: { name: 'dup' }, filePath: '/a.json' },
    { skill: { name: 'dup' }, filePath: '/b.json' }
  ];
  const errs = checkDuplicates(skills);
  assert.strictEqual(errs.length, 1);
});

test('no duplicates = no errors', () => {
  const skills = [
    { skill: { name: 'a' }, filePath: '/a.json' },
    { skill: { name: 'b' }, filePath: '/b.json' }
  ];
  const errs = checkDuplicates(skills);
  assert.strictEqual(errs.length, 0);
});

console.log('\ncheckCircular');
test('detects circular deps', () => {
  const skills = [
    { skill: { name: 'a', dependencies: ['b'] }, filePath: '/a.json' },
    { skill: { name: 'b', dependencies: ['a'] }, filePath: '/b.json' }
  ];
  const errs = checkCircular(skills);
  assert.ok(errs.length > 0);
});

test('no circular deps = no errors', () => {
  const skills = [
    { skill: { name: 'a', dependencies: ['b'] }, filePath: '/a.json' },
    { skill: { name: 'b', dependencies: [] }, filePath: '/b.json' }
  ];
  const errs = checkCircular(skills);
  assert.strictEqual(errs.length, 0);
});

test('ignores missing deps', () => {
  const skills = [
    { skill: { name: 'a', dependencies: ['nonexistent'] }, filePath: '/a.json' }
  ];
  const errs = checkCircular(skills);
  assert.strictEqual(errs.length, 0);
});

console.log('\nvalidate (single file)');
test('validates a good file', () => {
  const skill = { name: 'good', version: '1.0.0', description: 'A perfectly fine skill' };
  const fp = path.join(TMP, 'good.json');
  fs.writeFileSync(fp, JSON.stringify(skill));
  const result = validate(fp);
  assert.strictEqual(result.grade, 'A');
});

test('validates a bad file', () => {
  const skill = {};
  const fp = path.join(TMP, 'bad2.json');
  fs.writeFileSync(fp, JSON.stringify(skill));
  const result = validate(fp);
  assert.strictEqual(result.grade, 'F');
  assert.ok(result.errors.length > 0);
});

console.log('\nvalidateDir');
test('validates directory of skills', () => {
  fs.mkdirSync(path.join(TMP, 'skills'), { recursive: true });
  const skill1 = { name: 'skill-a', version: '1.0.0', description: 'First skill' };
  const skill2 = { name: 'skill-b', version: '2.0.0', description: 'Second skill' };
  fs.writeFileSync(path.join(TMP, 'skills', 'a.json'), JSON.stringify(skill1));
  fs.writeFileSync(path.join(TMP, 'skills', 'b.json'), JSON.stringify(skill2));
  const result = validateDir(path.join(TMP, 'skills'));
  assert.strictEqual(result.results.length, 2);
  assert.strictEqual(result.overall.grade, 'A');
});

test('detects duplicates in directory', () => {
  fs.mkdirSync(path.join(TMP, 'dupes'), { recursive: true });
  const skill = { name: 'same', version: '1.0.0', description: 'Same name skill' };
  fs.writeFileSync(path.join(TMP, 'dupes', 'a.json'), JSON.stringify(skill));
  fs.writeFileSync(path.join(TMP, 'dupes', 'b.json'), JSON.stringify(skill));
  const result = validateDir(path.join(TMP, 'dupes'));
  assert.ok(result.results[0].errors.some(e => e.message.includes('Duplicate')));
});

test('handles parse errors gracefully', () => {
  fs.mkdirSync(path.join(TMP, 'broken'), { recursive: true });
  fs.writeFileSync(path.join(TMP, 'broken', 'bad.json'), '{not valid json}');
  const result = validateDir(path.join(TMP, 'broken'));
  // Parse error creates 1 error (-20pts = 80 = B), not F
  assert.ok(result.results[0].grade !== 'A');
  assert.ok(result.results[0].errors[0].message.includes('Parse error'));
});

test('ignores non-skill files', () => {
  fs.mkdirSync(path.join(TMP, 'mixed'), { recursive: true });
  fs.writeFileSync(path.join(TMP, 'mixed', 'skill.json'), JSON.stringify({ name: 'x', version: '1.0.0', description: 'Test' }));
  fs.writeFileSync(path.join(TMP, 'mixed', 'readme.md'), '# Hello');
  fs.writeFileSync(path.join(TMP, 'mixed', 'data.txt'), 'random stuff');
  const result = validateDir(path.join(TMP, 'mixed'));
  assert.strictEqual(result.results.length, 1);
});

test('detects circular deps across files', () => {
  fs.mkdirSync(path.join(TMP, 'circular'), { recursive: true });
  fs.writeFileSync(path.join(TMP, 'circular', 'a.json'), JSON.stringify({
    name: 'skill-a', version: '1.0.0', description: 'Circular A', dependencies: ['skill-b']
  }));
  fs.writeFileSync(path.join(TMP, 'circular', 'b.json'), JSON.stringify({
    name: 'skill-b', version: '1.0.0', description: 'Circular B', dependencies: ['skill-a']
  }));
  const result = validateDir(path.join(TMP, 'circular'));
  const circErrs = result.results[0].errors.filter(e => e.message.includes('Circular'));
  assert.ok(circErrs.length > 0);
});

cleanup();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
