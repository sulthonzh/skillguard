import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { glob } from 'glob';
import { SkillFile, SkillType, SkillFormat } from './types';

export class SkillDetector {
  private readonly skillPatterns = {
    claude: '**/*.md',
    codex: '**/*.json',
    cursor: '**/*.md',
    mcp: '**/*.yaml',
    custom: '**/*.md'
  };

  async detectSkills(inputPath: string): Promise<SkillFile[]> {
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

  private async scanDirectory(dirPath: string): Promise<SkillFile[]> {
    const skillFiles: SkillFile[] = [];
    
    for (const [type, pattern] of Object.entries(this.skillPatterns)) {
      const files = await glob(pattern, { 
        cwd: dirPath,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.git/**']
      });

      for (const file of files) {
        try {
          // Check if it's a file, not a directory
          const stats = fs.statSync(file);
          if (!stats.isFile()) continue;
          
          const skillFile = await this.parseSkillFile(file);
          if (this.validateSkill(skillFile)) {
            skillFiles.push(skillFile);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to parse skill file ${file}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return skillFiles;
  }

  private async parseSkillFile(filePath: string): Promise<SkillFile> {
    const content = fs.readFileSync(filePath, 'utf8');
    const name = path.basename(filePath);
    
    let type: SkillType = 'custom';
    let format: SkillFormat = 'markdown';

    // Determine type based on filename and content
    if (name.toUpperCase().includes('SKILL')) {
      type = 'claude';
    } else if (name.toLowerCase().includes('rule')) {
      type = 'cursor';
    } else if (name.toLowerCase().includes('mcp')) {
      type = 'mcp';
      format = 'yaml';
    } else if (filePath.endsWith('.json')) {
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

  private validateSkill(skillFile: SkillFile): boolean {
    // Basic validation - check if content looks like a skill
    const trimmed = skillFile.content.trim();
    
    if (trimmed.length === 0) {
      return false;
    }

    // Check for common skill patterns (relaxed)
    const skillPatterns = [
      /TOOL_DEFINITION|tools:/i,  // Claude
      /"tools"\s*:/,             // Codex
      /tool\s*:/,                // Generic
      /shell\s*:/,               // Shell commands
      /```.*\n.*```/,            // Code blocks
      /skills?/i,                // Generic skills mention
      /#\s*skills?/i,           // Header with skills
      /#\s*tools?/i,            // Header with tools
      /find\s+.*-exec/,         // Common shell patterns
    ];

    return skillPatterns.some(pattern => pattern.test(trimmed));
  }
}