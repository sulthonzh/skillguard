import chalk from 'chalk';
import { SkillScanResult, ScanSummary } from './types';

export class OutputFormatter {
  formatScanResults(results: SkillScanResult[], summary: ScanSummary, quiet: boolean = false): string {
    if (quiet) {
      return this.formatQuiet(results);
    }

    let output = '';
    output += this.formatHeader(summary);
    
    results.forEach(result => {
      output += this.formatSkillResult(result);
      if (result.conflicts && result.conflicts.length > 0) {
        output += this.formatConflicts(result.conflicts);
      }
      output += '\n';
    });

    output += this.formatSummary(summary);

    return output;
  }

  formatJsonResults(results: SkillScanResult[], summary: ScanSummary): string {
    return JSON.stringify({ results, summary }, null, 2);
  }

  formatDiffResults(diffResult: any): string {
    let output = '';
    
    output += '🔍 DIFF RESULTS\n';
    output += '='.repeat(50) + '\n\n';
    
    output += `📁 Old: ${diffResult.result.oldSkill.name}\n`;
    output += `📁 New: ${diffResult.result.newSkill.name}\n\n`;

    if (diffResult.risksAdded.length > 0) {
      output += '🔴 RISKS ADDED:\n';
      diffResult.risksAdded.forEach((risk: any) => {
        output += `  ${this.getRiskEmoji(risk.severity)} ${risk.description}\n`;
        if (risk.pattern) {
          output += `    Pattern: ${risk.pattern}\n`;
        }
        output += '\n';
      });
    }

    if (diffResult.risksRemoved.length > 0) {
      output += '🟢 RISKS REMOVED:\n';
      diffResult.risksRemoved.forEach((risk: any) => {
        output += `  ${this.getRiskEmoji(risk.severity)} ${risk.description}\n`;
        if (risk.pattern) {
          output += `    Pattern: ${risk.pattern}\n`;
        }
        output += '\n';
      });
    }

    if (diffResult.conflicts.length > 0) {
      output += '⚠️  CONFLICTS:\n';
      diffResult.conflicts.forEach((conflict: any) => {
        output += `  ${this.getConflictEmoji(conflict.severity)} ${conflict.description}\n`;
        output += `    Skills: ${conflict.affectedSkills.join(', ')}\n`;
        if (conflict.suggestion) {
          output += `    💡 ${conflict.suggestion}\n`;
        }
        output += '\n';
      });
    }

    return output;
  }

  private formatHeader(summary: ScanSummary): string {
    let header = '🔍 SKILLGUARD SECURITY SCAN\n';
    header += '='.repeat(50) + '\n\n';
    header += `📊 Summary: ${summary.totalSkills} skills scanned\n`;
    header += `🟢 Green: ${summary.greenSkills} | 🟡 Yellow: ${summary.yellowSkills} | 🔴 Red: ${summary.redSkills}\n`;
    header += `⚠️  Total Risks: ${summary.totalRisks} | 🔥 Critical: ${summary.criticalRisks}\n`;
    header += `💥 Conflicts: ${summary.totalConflicts}\n\n`;

    return header;
  }

  private formatSkillResult(result: SkillScanResult): string {
    const trustEmoji = this.getTrustEmoji(result.trustScore);
    const trustColor = this.getTrustColor(result.trustScore);
    
    let output = `${trustColor} ${result.skill.name}\n`;
    output += `   ${chalk.gray('Trust score:')} ${trustEmoji} ${result.trustScore}\n`;
    output += `   ${chalk.gray('Type:')} ${result.skill.type} | ${chalk.gray('Format:')} ${result.skill.format}\n`;

    if (result.permissions.length > 0) {
      output += `   ${chalk.gray('Permissions:')} ${this.formatPermissions(result.permissions)}\n`;
    }

    if (result.risks.length > 0) {
      output += '\n   🚨 Security Risks:\n';
      result.risks.forEach(risk => {
        const riskEmoji = this.getRiskEmoji(risk.severity);
        const riskColor = this.getRiskColor(risk.severity);
        output += `      ${riskColor} ${riskEmoji} ${risk.description}\n`;
        if (risk.line) {
          output += `         ${chalk.gray(`Line ${risk.line}:`)} ${risk.pattern}\n`;
        }
        if (risk.suggestion) {
          output += `         💡 ${chalk.gray(risk.suggestion)}\n`;
        }
      });
    }

    if (result.suggestions && result.suggestions.length > 0) {
      output += '\n   💡 Suggestions:\n';
      result.suggestions.forEach(suggestion => {
        output += `      ${chalk.gray('•')} ${suggestion}\n`;
      });
    }

    return output;
  }

  private formatConflicts(conflicts: any[]): string {
    let output = '\n   ⚠️  Potential Conflicts:\n';
    
    conflicts.forEach((conflict: any) => {
      const conflictEmoji = this.getConflictEmoji(conflict.severity);
      const conflictColor = this.getConflictColor(conflict.severity);
      
      output += `      ${conflictColor} ${conflictEmoji} ${conflict.description}\n`;
      output += `         ${chalk.gray('Skills:')} ${conflict.affectedSkills.join(', ')}\n`;
      
      if (conflict.suggestion) {
        output += `         💡 ${chalk.gray(conflict.suggestion)}\n`;
      }
    });

    return output;
  }

  private formatSummary(summary: ScanSummary): string {
    let output = '\n' + '='.repeat(50) + '\n';
    output += '📊 SCAN SUMMARY\n';
    output += `${chalk.gray('Total Skills:')} ${summary.totalSkills}\n`;
    output += `${chalk.green('🟢 Green (Safe):')} ${summary.greenSkills}\n`;
    output += `${chalk.yellow('🟡 Yellow (Caution):')} ${summary.yellowSkills}\n`;
    output += `${chalk.red('🔴 Red (Risky):')} ${summary.redSkills}\n`;
    output += `${chalk.gray('Total Risks:')} ${summary.totalRisks}\n`;
    output += `${chalk.red('🔥 Critical Risks:')} ${summary.criticalRisks}\n`;
    output += `${chalk.gray('Conflicts:')} ${summary.totalConflicts}\n`;

    if (summary.suggestions.length > 0) {
      output += '\n💡 GENERAL SUGGESTIONS:\n';
      summary.suggestions.forEach(suggestion => {
        output += `   ${chalk.gray('•')} ${suggestion}\n`;
      });
    }

    // CI Exit code logic
    if (summary.criticalRisks > 0) {
      output += '\n❌ CI: Failed - Critical risks detected\n';
    } else if (summary.redSkills > 0) {
      output += '\n⚠️  CI: Warning - High-risk skills present\n';
    } else {
      output += '\n✅ CI: Passed - No critical issues\n';
    }

    return output;
  }

  private formatQuiet(results: SkillScanResult[]): string {
    const errors = results.filter(r => 
      r.risks.some(risk => risk.severity === 'CRITICAL') || 
      r.trustScore === 'RED'
    );

    if (errors.length === 0) {
      return '';
    }

    let output = '⚠️  ISSUES FOUND:\n\n';
    
    errors.forEach(result => {
      output += `${result.skill.name}:\n`;
      result.risks.forEach(risk => {
        if (risk.severity === 'CRITICAL') {
          output += `  🔴 ${risk.description}\n`;
        }
      });
      output += '\n';
    });

    return output;
  }

  private getTrustEmoji(score: string): string {
    switch (score) {
      case 'GREEN': return '🟢';
      case 'YELLOW': return '🟡';
      case 'RED': return '🔴';
      default: return '⚪';
    }
  }

  private getRiskEmoji(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  }

  private getConflictEmoji(severity: string): string {
    switch (severity) {
      case 'ERROR': return '🚨';
      case 'WARNING': return '⚠️';
      case 'INFO': return 'ℹ️';
      default: return '❓';
    }
  }

  private getTrustColor(score: string): any {
    switch (score) {
      case 'GREEN': return chalk.green;
      case 'YELLOW': return chalk.yellow;
      case 'RED': return chalk.red;
      default: return chalk.gray;
    }
  }

  private getRiskColor(severity: string): any {
    switch (severity) {
      case 'CRITICAL': return chalk.red.bold;
      case 'HIGH': return chalk.red;
      case 'MEDIUM': return chalk.yellow;
      case 'LOW': return chalk.green;
      default: return chalk.gray;
    }
  }

  private getConflictColor(severity: string): any {
    switch (severity) {
      case 'ERROR': return chalk.red.bold;
      case 'WARNING': return chalk.yellow.bold;
      case 'INFO': return chalk.blue;
      default: return chalk.gray;
    }
  }

  private formatPermissions(permissions: any[]): string {
    return permissions.map((p: any) => {
      let perm = `${p.category}`;
      if (p.access !== 'none') {
        perm += `:${p.access}`;
      }
      if (p.patterns && p.patterns.length > 0) {
        perm += ` (${p.patterns.slice(0, 2).join(', ')})`;
      }
      return perm;
    }).join(', ');
  }
}