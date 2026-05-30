#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputFormatter = exports.scanEngine = exports.program = void 0;
const commander_1 = require("commander");
const scan_engine_1 = require("./scan-engine");
const output_formatter_1 = require("./output-formatter");
const chalk_1 = __importDefault(require("chalk"));
const program = new commander_1.Command();
exports.program = program;
const scanEngine = new scan_engine_1.ScanEngine();
exports.scanEngine = scanEngine;
const outputFormatter = new output_formatter_1.OutputFormatter();
exports.outputFormatter = outputFormatter;
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
    .action(async (path, options) => {
    try {
        console.log(`🔍 Scanning ${path}...`);
        const results = await scanEngine.scanSkills(path, options);
        if (options.json) {
            console.log(outputFormatter.formatJsonResults(results.results, results.summary));
        }
        else {
            console.log(outputFormatter.formatScanResults(results.results, results.summary, options.quiet));
        }
        // CI mode exit codes
        if (options.ci) {
            if (results.summary.criticalRisks > 0) {
                process.exit(1); // Critical risks
            }
            else if (results.summary.redSkills > 0) {
                process.exit(2); // High-risk skills
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
});
program
    .command('diff')
    .description('Compare two skill files')
    .argument('<oldFile>', 'Old skill file path')
    .argument('<newFile>', 'New skill file path')
    .option('-j, --json', 'JSON output format', false)
    .action(async (oldFile, newFile, options) => {
    try {
        console.log(`🔍 Comparing ${oldFile} vs ${newFile}...`);
        const diffResult = await scanEngine.scanDiff(oldFile, newFile);
        if (options.json) {
            console.log(JSON.stringify(diffResult, null, 2));
        }
        else {
            console.log(outputFormatter.formatDiffResults(diffResult));
        }
        // Exit with error if issues found
        if (diffResult.risksAdded.length > 0 || diffResult.conflicts.length > 0) {
            process.exit(1);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
});
program
    .command('validate')
    .description('Validate skill file syntax')
    .argument('<file>', 'Skill file path')
    .action(async (file) => {
    try {
        const skills = await scanEngine['skillDetector'].detectSkills(file);
        if (skills.length === 0) {
            console.log(chalk_1.default.red('❌ No valid skills found'));
            process.exit(1);
        }
        console.log(chalk_1.default.green(`✅ Valid skill: ${skills[0].name}`));
        console.log(chalk_1.default.gray(`  Type: ${skills[0].type}`));
        console.log(chalk_1.default.gray(`  Format: ${skills[0].format}`));
        console.log(chalk_1.default.gray(`  Size: ${skills[0].content.length} characters`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Validation error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
});
// Auto-detect if being called directly
if (require.main === module) {
    program.parse();
}
//# sourceMappingURL=index.js.map