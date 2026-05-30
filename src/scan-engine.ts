import { SkillFile, SkillScanResult, ScanSummary, Permission } from './types';
import { SkillDetector } from './skill-detector';
import { SecurityScanner } from './security-scanner';
import { ConflictDetector } from './conflict-detector';

export class ScanEngine {
  private skillDetector = new SkillDetector();
  private securityScanner = new SecurityScanner();
  private conflictDetector = new ConflictDetector();

  async scanSkills(inputPath: string, options: { ci?: boolean; quiet?: boolean } = {}): Promise<{
    results: SkillScanResult[];
    summary: ScanSummary;
  }> {
    const skills = await this.skillDetector.detectSkills(inputPath);
    const results: SkillScanResult[] = [];

    // Detect conflicts across all skills first
    const allConflicts = options.ci ? [] : this.conflictDetector.detectConflicts(skills);
    
    for (const skill of skills) {
      const risks = this.securityScanner.scan(skill.content, skill.path);
      const trustScore = this.securityScanner.calculateTrustScore(risks);
      const permissions = this.extractPermissions(skill);
      
      // Filter conflicts that affect this specific skill
      const skillConflicts = allConflicts.filter(conflict => 
        conflict.affectedSkills.includes(skill.name)
      );
      
      const suggestions = this.generateSuggestions(skill, risks, skillConflicts);

      results.push({
        skill,
        trustScore,
        permissions,
        risks,
        conflicts: skillConflicts.length > 0 ? skillConflicts : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      });
    }

    const summary = this.generateSummary(results);
    return { results, summary };
  }

  async scanDiff(oldFile: string, newFile: string): Promise<{
    result: any;
    risksAdded: any[];
    risksRemoved: any[];
    conflicts: any[];
  }> {
    // Implementation for diff mode
    // This would parse both files and compare them
    const oldSkill = await this.skillDetector.detectSkills(oldFile);
    const newSkill = await this.skillDetector.detectSkills(newFile);
    
    const oldRisks = this.securityScanner.scan(oldSkill[0].content);
    const newRisks = this.securityScanner.scan(newSkill[0].content);
    
    const conflicts = this.conflictDetector.detectConflicts([oldSkill[0], newSkill[0]]);

    return {
      result: {
        oldSkill: oldSkill[0],
        newSkill: newSkill[0]
      },
      risksAdded: newRisks.filter(risk => !oldRisks.some(old => old.pattern === risk.pattern)),
      risksRemoved: oldRisks.filter(risk => !newRisks.some(neww => neww.pattern === risk.pattern)),
      conflicts
    };
  }

  private extractPermissions(skill: SkillFile): Permission[] {
    const permissions: Permission[] = [];

    // Analyze skill content for permissions
    const content = skill.content.toLowerCase();

    // File system permissions
    if (content.match(/\b(file|read|write|path|directory)\b/gi)) {
      permissions.push({
        category: 'filesystem',
        access: content.match(/\bwrite\b/gi) ? 'write' : 'read',
        patterns: this.extractFilePatterns(content)
      });
    }

    // Shell permissions
    if (content.match(/\b(shell|exec|command|run)\b/gi)) {
      permissions.push({
        category: 'shell',
        access: 'execute',
        patterns: this.extractCommandPatterns(content)
      });
    }

    // Network permissions
    if (content.match(/\b(network|http|url|fetch|curl)\b/gi)) {
      permissions.push({
        category: 'network',
        access: 'read',
        patterns: this.extractUrlPatterns(content)
      });
    }

    // Environment permissions
    if (content.match(/\b(environment|env|variable)\b/gi)) {
      permissions.push({
        category: 'environment',
        access: 'read'
      });
    }

    return permissions;
  }

  private extractFilePatterns(content: string): string[] {
    const patterns = [];
    const fileMatches = content.match(/\b[/\w\._-]+\b/g) || [];
    
    for (const match of fileMatches) {
      if (match.length > 2 && (match.includes('.') || match.includes('/') || match.includes('_'))) {
        patterns.push(match);
      }
    }

    return [...new Set(patterns)].slice(0, 5); // Limit to 5 patterns
  }

  private extractCommandPatterns(content: string): string[] {
    const patterns = [];
    const commandMatches = content.match(/\b\w+\s+\w+/g) || [];
    
    for (const match of commandMatches) {
      if (match.length > 3) {
        patterns.push(match);
      }
    }

    return [...new Set(patterns)].slice(0, 5);
  }

  private extractUrlPatterns(content: string): string[] {
    const urlMatches = content.match(/https?:\/\/[^\s<>"{}|\\^`[\]]*/g) || [];
    return urlMatches.slice(0, 3);
  }

  private generateSuggestions(skill: SkillFile, risks: any[], conflicts: any[]): string[] {
    const suggestions: string[] = [];

    // Risk-based suggestions
    const criticalRisks = risks.filter(r => r.severity === 'CRITICAL');
    if (criticalRisks.length > 0) {
      suggestions.push(`Critical security risks detected. Review skill carefully before use.`);
    }

    // Conflict-based suggestions
    if (conflicts.length > 0) {
      suggestions.push(`Conflicts detected with other skills. Review compatibility.`);
    }

    // Type-specific suggestions
    switch (skill.type) {
      case 'claude':
        if (!skill.content.includes('TOOL_DEFINITION')) {
          suggestions.push(`Consider adding proper TOOL_DEFINITIONS for Claude skills.`);
        }
        break;
      case 'cursor':
        if (!skill.content.includes('shell:')) {
          suggestions.push(`Cursor skills should define shell commands explicitly.`);
        }
        break;
    }

    return suggestions;
  }

  private generateSummary(results: SkillScanResult[]): ScanSummary {
    const summary: ScanSummary = {
      totalSkills: results.length,
      greenSkills: 0,
      yellowSkills: 0,
      redSkills: 0,
      totalRisks: 0,
      criticalRisks: 0,
      totalConflicts: 0,
      suggestions: []
    };

    results.forEach(result => {
      switch (result.trustScore) {
        case 'GREEN':
          summary.greenSkills++;
          break;
        case 'YELLOW':
          summary.yellowSkills++;
          break;
        case 'RED':
          summary.redSkills++;
          break;
      }

      summary.totalRisks += result.risks.length;
      summary.criticalRisks += result.risks.filter(r => r.severity === 'CRITICAL').length;
      summary.totalConflicts += (result.conflicts?.length || 0);

      if (result.suggestions) {
        summary.suggestions.push(...result.suggestions);
      }
    });

    summary.suggestions = [...new Set(summary.suggestions)].slice(0, 5); // Limit to 5 unique suggestions

    return summary;
  }
}