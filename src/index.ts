#!/usr/bin/env node

import { Command } from 'commander';
import { ScanEngine } from './scan-engine';
import { OutputFormatter } from './output-formatter';
import { ScanOptions } from './types';
import chalk from 'chalk';

const program = new Command();
const scanEngine = new ScanEngine();
const outputFormatter = new OutputFormatter();

program
  .name('skillguard')
  .description('Security scanner for AI agent skills')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan skills for security risks and conflicts')
  .argument('<path>', 'Path to skills directory or file')
  .option('-c, --ci', 'CI mode - exit with error code if issues found', false)
  .option('-q, --quiet', 'Quiet mode - only show errors', false)
  .option('-j, --json', 'JSON output format', false)
  .action(async (path: string, options: { ci?: boolean; quiet?: boolean; json?: boolean }) => {
    try {
      console.log(`🔍 Scanning ${path}...`);
      
      const results = await scanEngine.scanSkills(path, options);
      
      if (options.json) {
        console.log(outputFormatter.formatJsonResults(results.results, results.summary));
      } else {
        console.log(outputFormatter.formatScanResults(results.results, results.summary, options.quiet));
      }

      // CI mode exit codes
      if (options.ci) {
        if (results.summary.criticalRisks > 0) {
          process.exit(1); // Critical risks
        } else if (results.summary.redSkills > 0) {
          process.exit(2); // High-risk skills
        }
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program
  .command('diff')
  .description('Compare two skill files')
  .argument('<oldFile>', 'Old skill file path')
  .argument('<newFile>', 'New skill file path')
  .option('-j, --json', 'JSON output format', false)
  .action(async (oldFile: string, newFile: string, options: { json?: boolean }) => {
    try {
      console.log(`🔍 Comparing ${oldFile} vs ${newFile}...`);
      
      const diffResult = await scanEngine.scanDiff(oldFile, newFile);
      
      if (options.json) {
        console.log(JSON.stringify(diffResult, null, 2));
      } else {
        console.log(outputFormatter.formatDiffResults(diffResult));
      }

      // Exit with error if issues found
      if (diffResult.risksAdded.length > 0 || diffResult.conflicts.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate skill file syntax')
  .argument('<file>', 'Skill file path')
  .action(async (file: string) => {
    try {
      const skills = await scanEngine['skillDetector'].detectSkills(file);
      
      if (skills.length === 0) {
        console.log(chalk.red('❌ No valid skills found'));
        process.exit(1);
      }

      console.log(chalk.green(`✅ Valid skill: ${skills[0].name}`));
      console.log(chalk.gray(`  Type: ${skills[0].type}`));
      console.log(chalk.gray(`  Format: ${skills[0].format}`));
      console.log(chalk.gray(`  Size: ${skills[0].content.length} characters`));
    } catch (error) {
      console.error(chalk.red(`❌ Validation error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Auto-detect if being called directly
if (require.main === module) {
  program.parse();
}

export { program, scanEngine, outputFormatter };