#!/usr/bin/env node
'use strict';

const { validate, validateDir, score } = require('./index');
const { validateMarkdown } = require('./markdown');
const fs = require('fs');
const path = require('path');

function gradeEmoji(grade) {
  const map = { A: '✅', B: '👍', C: '⚠️', D: '🔸', F: '❌' };
  return map[grade] || '❓';
}

function printResult(result, verbose) {
  const emoji = gradeEmoji(result.grade);
  const relPath = (result.filePath || result.file || '').replace(process.cwd() + '/', '');

  const name = result.skill?.name || path.basename(relPath);
  console.log(`  ${emoji} ${name} — ${result.grade} (${result.points}/${result.max}) [${relPath}]`);

  if (verbose || result.errors.length > 0) {
    for (const e of result.errors) {
      console.log(`    ❌ ${e.field}: ${e.message}`);
    }
  }

  if (verbose) {
    for (const w of result.warnings) {
      console.log(`    ⚠️  ${w.field}: ${w.message}`);
    }
    for (const i of (result.info || [])) {
      console.log(`    ℹ️  ${i.field}: ${i.message}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help') {
    console.log(`skillguard — validate AI skill/agent definitions

Usage:
  skillguard check <file-or-dir>           Validate skill files
  skillguard check <file-or-dir> --verbose Show all findings
  skillguard check <dir> --min-score B     Fail below grade B
  skillguard check <dir> --format json     JSON output

Supports:
  JSON/YAML skill definitions (.json, .yaml, .yml)
  Markdown skill docs (.md, .markdown) — SKILL.md

Examples:
  skillguard check ./skills/my-skill.json
  skillguard check ./skills/ --min-score B
  skillguard check SKILL.md --format json`);
    process.exit(0);
  }

  if (command !== 'check') {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  const target = args[1];
  if (!target) {
    console.error('Specify a file or directory to check');
    process.exit(1);
  }

  const minScore = args.includes('--min-score') ? args[args.indexOf('--min-score') + 1] : null;
  const jsonOutput = args.includes('--format') && args[args.indexOf('--format') + 1] === 'json';
  const verbose = args.includes('--verbose');

  let results = [];
  let overall;

  const resolved = path.resolve(target);
  const stat = fs.statSync(resolved);
  const ext = path.extname(resolved).toLowerCase();

  if (stat.isFile() && ['.md', '.markdown'].includes(ext)) {
    // Markdown skill file
    const r = validateMarkdown(resolved);
    if (r.error) {
      results = [{ errors: [{ field: '-', message: r.error, severity: 'error' }], warnings: [], info: [], grade: 'F', points: 0, max: 100, filePath: resolved }];
    } else {
      results = [r];
    }
    overall = { grade: results[0].grade, points: results[0].points, max: 100 };
  } else if (stat.isFile()) {
    // JSON/YAML skill file
    const r = validate(resolved);
    results = [r];
    overall = { grade: r.grade, points: r.points, max: r.max };
  } else if (stat.isDirectory()) {
    // Check if dir has .md files
    const entries = fs.readdirSync(resolved);
    const mdFiles = entries.filter(e => ['.md', '.markdown'].includes(path.extname(e).toLowerCase()));
    const skillFiles = entries.filter(e => ['.json', '.yaml', '.yml'].includes(path.extname(e).toLowerCase()));

    if (mdFiles.length > 0 && skillFiles.length === 0) {
      // Markdown directory
      for (const f of mdFiles) {
        const r = validateMarkdown(path.join(resolved, f));
        if (r.error) {
          results.push({ errors: [{ field: '-', message: r.error, severity: 'error' }], warnings: [], info: [], grade: 'F', points: 0, max: 100, filePath: path.join(resolved, f) });
        } else {
          results.push(r);
        }
      }
    } else {
      // JSON/YAML directory (or mixed)
      const dirResult = validateDir(resolved);
      results = dirResult.results;
    }

    const totalScore = results.reduce((sum, r) => sum + r.points, 0);
    const avgScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;
    let avgGrade;
    if (avgScore >= 90) avgGrade = 'A';
    else if (avgScore >= 80) avgGrade = 'B';
    else if (avgScore >= 65) avgGrade = 'C';
    else if (avgScore >= 50) avgGrade = 'D';
    else avgGrade = 'F';
    overall = { grade: avgGrade, points: avgScore, max: 100 };
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ results, overall }, null, 2));
  } else {
    console.log(`\nskillguard — checking ${results.length} skill(s)\n`);
    for (const r of results) {
      printResult(r, verbose);
    }
    console.log(`\nOverall: ${gradeEmoji(overall.grade)} ${overall.grade} (${overall.points}/${overall.max})\n`);
  }

  // CI threshold
  if (minScore) {
    const gradeOrder = ['F', 'D', 'C', 'B', 'A'];
    if (gradeOrder.indexOf(overall.grade) < gradeOrder.indexOf(minScore.toUpperCase())) {
      console.error(`Failed: grade ${overall.grade} below threshold ${minScore.toUpperCase()}`);
      process.exit(1);
    }
  }

  if (results.some(r => r.errors.length > 0)) process.exit(1);
}

main();
