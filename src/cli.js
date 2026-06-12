#!/usr/bin/env node
'use strict';

const { validate, validateDir, score } = require('./index');
const path = require('fs');

function gradeEmoji(grade) {
  const map = { A: '✅', B: '👍', C: '⚠️', D: '🔸', F: '❌' };
  return map[grade] || '❓';
}

function printResult(result, verbose) {
  const emoji = gradeEmoji(result.grade);
  const relPath = result.filePath.replace(process.cwd() + '/', '');

  if (result.skill.name) {
    console.log(`  ${emoji} ${result.skill.name} — ${result.grade} (${result.points}/${result.max}) [${relPath}]`);
  } else {
    console.log(`  ${emoji} ${relPath} — ${result.grade} (${result.points}/${result.max})`);
  }

  if (verbose || result.errors.length > 0) {
    for (const e of result.errors) {
      console.log(`    ❌ ${e.field}: ${e.message}`);
    }
  }

  if (verbose) {
    for (const w of result.warnings) {
      console.log(`    ⚠️  ${w.field}: ${w.message}`);
    }
    for (const i of result.info) {
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
  skillguard check <file-or-dir>  Validate skill files
  skillguard check <dir> --min-score B  Fail below grade B
  skillguard check <dir> --format json  JSON output
  skillguard check <dir> --verbose     Show warnings and info

Examples:
  skillguard check ./skills/my-skill.json
  skillguard check ./skills/ --min-score B
  skillguard check ./skills/ --format json`);
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

  let results;
  let overall;

  const stat = require('fs').statSync(target);

  if (stat.isDirectory()) {
    const dirResult = validateDir(target);
    results = dirResult.results;
    overall = dirResult.overall;
  } else {
    const r = validate(target);
    results = [r];
    overall = { grade: r.grade, points: r.points, max: r.max };
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

  // CI threshold check
  if (minScore) {
    const gradeOrder = ['F', 'D', 'C', 'B', 'A'];
    const currentIdx = gradeOrder.indexOf(overall.grade);
    const minIdx = gradeOrder.indexOf(minScore.toUpperCase());
    if (currentIdx < minIdx) {
      console.error(`Failed: overall grade ${overall.grade} is below threshold ${minScore.toUpperCase()}`);
      process.exit(1);
    }
  }

  // Exit 1 if any errors
  const hasErrors = results.some(r => r.errors.length > 0);
  if (hasErrors) {
    process.exit(1);
  }
}

main();
