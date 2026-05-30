"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillDetector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
class SkillDetector {
    constructor() {
        this.skillPatterns = {
            claude: '**/*.md',
            codex: '**/*.json',
            cursor: '**/*.md',
            mcp: '**/*.yaml',
            custom: '**/*.md'
        };
    }
    async detectSkills(inputPath) {
        const absolutePath = path.resolve(inputPath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Path does not exist: ${absolutePath}`);
        }
        const stats = fs.statSync(absolutePath);
        if (stats.isFile()) {
            return [await this.parseSkillFile(absolutePath)];
        }
        if (stats.isDirectory()) {
            return await this.scanDirectory(absolutePath);
        }
        throw new Error(`Invalid path type: ${absolutePath}`);
    }
    async scanDirectory(dirPath) {
        const skillFiles = [];
        for (const [type, pattern] of Object.entries(this.skillPatterns)) {
            const files = await (0, glob_1.glob)(pattern, {
                cwd: dirPath,
                absolute: true,
                ignore: ['**/node_modules/**', '**/.git/**']
            });
            for (const file of files) {
                try {
                    // Check if it's a file, not a directory
                    const stats = fs.statSync(file);
                    if (!stats.isFile())
                        continue;
                    const skillFile = await this.parseSkillFile(file);
                    if (this.validateSkill(skillFile)) {
                        skillFiles.push(skillFile);
                    }
                }
                catch (error) {
                    console.warn(`⚠️  Failed to parse skill file ${file}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        return skillFiles;
    }
    async parseSkillFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const name = path.basename(filePath);
        let type = 'custom';
        let format = 'markdown';
        // Determine type based on filename and content
        if (name.toUpperCase().includes('SKILL')) {
            type = 'claude';
        }
        else if (name.toLowerCase().includes('rule')) {
            type = 'cursor';
        }
        else if (name.toLowerCase().includes('mcp')) {
            type = 'mcp';
            format = 'yaml';
        }
        else if (filePath.endsWith('.json')) {
            type = 'codex';
            format = 'json';
        }
        return {
            path: filePath,
            name,
            content,
            type,
            format
        };
    }
    validateSkill(skillFile) {
        // Basic validation - check if content looks like a skill
        const trimmed = skillFile.content.trim();
        if (trimmed.length === 0) {
            return false;
        }
        // Check for common skill patterns (relaxed)
        const skillPatterns = [
            /TOOL_DEFINITION|tools:/i, // Claude
            /"tools"\s*:/, // Codex
            /tool\s*:/, // Generic
            /shell\s*:/, // Shell commands
            /```.*\n.*```/, // Code blocks
            /skills?/i, // Generic skills mention
            /#\s*skills?/i, // Header with skills
            /#\s*tools?/i, // Header with tools
            /find\s+.*-exec/, // Common shell patterns
        ];
        return skillPatterns.some(pattern => pattern.test(trimmed));
    }
}
exports.SkillDetector = SkillDetector;
//# sourceMappingURL=skill-detector.js.map