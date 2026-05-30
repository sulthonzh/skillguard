"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputFormatter = void 0;
const chalk_1 = __importDefault(require("chalk"));
class OutputFormatter {
    formatScanResults(results, summary, quiet = false) {
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
    formatJsonResults(results, summary) {
        return JSON.stringify({ results, summary }, null, 2);
    }
    formatDiffResults(diffResult) {
        let output = '';
        output += '🔍 DIFF RESULTS\n';
        output += '='.repeat(50) + '\n\n';
        output += `📁 Old: ${diffResult.result.oldSkill.name}\n`;
        output += `📁 New: ${diffResult.result.newSkill.name}\n\n`;
        if (diffResult.risksAdded.length > 0) {
            output += '🔴 RISKS ADDED:\n';
            diffResult.risksAdded.forEach((risk) => {
                output += `  ${this.getRiskEmoji(risk.severity)} ${risk.description}\n`;
                if (risk.pattern) {
                    output += `    Pattern: ${risk.pattern}\n`;
                }
                output += '\n';
            });
        }
        if (diffResult.risksRemoved.length > 0) {
            output += '🟢 RISKS REMOVED:\n';
            diffResult.risksRemoved.forEach((risk) => {
                output += `  ${this.getRiskEmoji(risk.severity)} ${risk.description}\n`;
                if (risk.pattern) {
                    output += `    Pattern: ${risk.pattern}\n`;
                }
                output += '\n';
            });
        }
        if (diffResult.conflicts.length > 0) {
            output += '⚠️  CONFLICTS:\n';
            diffResult.conflicts.forEach((conflict) => {
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
    formatHeader(summary) {
        let header = '🔍 SKILLGUARD SECURITY SCAN\n';
        header += '='.repeat(50) + '\n\n';
        header += `📊 Summary: ${summary.totalSkills} skills scanned\n`;
        header += `🟢 Green: ${summary.greenSkills} | 🟡 Yellow: ${summary.yellowSkills} | 🔴 Red: ${summary.redSkills}\n`;
        header += `⚠️  Total Risks: ${summary.totalRisks} | 🔥 Critical: ${summary.criticalRisks}\n`;
        header += `💥 Conflicts: ${summary.totalConflicts}\n\n`;
        return header;
    }
    formatSkillResult(result) {
        const trustEmoji = this.getTrustEmoji(result.trustScore);
        const trustColor = this.getTrustColor(result.trustScore);
        let output = `${trustColor} ${result.skill.name}\n`;
        output += `   ${chalk_1.default.gray('Trust score:')} ${trustEmoji} ${result.trustScore}\n`;
        output += `   ${chalk_1.default.gray('Type:')} ${result.skill.type} | ${chalk_1.default.gray('Format:')} ${result.skill.format}\n`;
        if (result.permissions.length > 0) {
            output += `   ${chalk_1.default.gray('Permissions:')} ${this.formatPermissions(result.permissions)}\n`;
        }
        if (result.risks.length > 0) {
            output += '\n   🚨 Security Risks:\n';
            result.risks.forEach(risk => {
                const riskEmoji = this.getRiskEmoji(risk.severity);
                const riskColor = this.getRiskColor(risk.severity);
                output += `      ${riskColor} ${riskEmoji} ${risk.description}\n`;
                if (risk.line) {
                    output += `         ${chalk_1.default.gray(`Line ${risk.line}:`)} ${risk.pattern}\n`;
                }
                if (risk.suggestion) {
                    output += `         💡 ${chalk_1.default.gray(risk.suggestion)}\n`;
                }
            });
        }
        if (result.suggestions && result.suggestions.length > 0) {
            output += '\n   💡 Suggestions:\n';
            result.suggestions.forEach(suggestion => {
                output += `      ${chalk_1.default.gray('•')} ${suggestion}\n`;
            });
        }
        return output;
    }
    formatConflicts(conflicts) {
        let output = '\n   ⚠️  Potential Conflicts:\n';
        conflicts.forEach((conflict) => {
            const conflictEmoji = this.getConflictEmoji(conflict.severity);
            const conflictColor = this.getConflictColor(conflict.severity);
            output += `      ${conflictColor} ${conflictEmoji} ${conflict.description}\n`;
            output += `         ${chalk_1.default.gray('Skills:')} ${conflict.affectedSkills.join(', ')}\n`;
            if (conflict.suggestion) {
                output += `         💡 ${chalk_1.default.gray(conflict.suggestion)}\n`;
            }
        });
        return output;
    }
    formatSummary(summary) {
        let output = '\n' + '='.repeat(50) + '\n';
        output += '📊 SCAN SUMMARY\n';
        output += `${chalk_1.default.gray('Total Skills:')} ${summary.totalSkills}\n`;
        output += `${chalk_1.default.green('🟢 Green (Safe):')} ${summary.greenSkills}\n`;
        output += `${chalk_1.default.yellow('🟡 Yellow (Caution):')} ${summary.yellowSkills}\n`;
        output += `${chalk_1.default.red('🔴 Red (Risky):')} ${summary.redSkills}\n`;
        output += `${chalk_1.default.gray('Total Risks:')} ${summary.totalRisks}\n`;
        output += `${chalk_1.default.red('🔥 Critical Risks:')} ${summary.criticalRisks}\n`;
        output += `${chalk_1.default.gray('Conflicts:')} ${summary.totalConflicts}\n`;
        if (summary.suggestions.length > 0) {
            output += '\n💡 GENERAL SUGGESTIONS:\n';
            summary.suggestions.forEach(suggestion => {
                output += `   ${chalk_1.default.gray('•')} ${suggestion}\n`;
            });
        }
        // CI Exit code logic
        if (summary.criticalRisks > 0) {
            output += '\n❌ CI: Failed - Critical risks detected\n';
        }
        else if (summary.redSkills > 0) {
            output += '\n⚠️  CI: Warning - High-risk skills present\n';
        }
        else {
            output += '\n✅ CI: Passed - No critical issues\n';
        }
        return output;
    }
    formatQuiet(results) {
        const errors = results.filter(r => r.risks.some(risk => risk.severity === 'CRITICAL') ||
            r.trustScore === 'RED');
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
    getTrustEmoji(score) {
        switch (score) {
            case 'GREEN': return '🟢';
            case 'YELLOW': return '🟡';
            case 'RED': return '🔴';
            default: return '⚪';
        }
    }
    getRiskEmoji(severity) {
        switch (severity) {
            case 'CRITICAL': return '🔴';
            case 'HIGH': return '🟠';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🟢';
            default: return '⚪';
        }
    }
    getConflictEmoji(severity) {
        switch (severity) {
            case 'ERROR': return '🚨';
            case 'WARNING': return '⚠️';
            case 'INFO': return 'ℹ️';
            default: return '❓';
        }
    }
    getTrustColor(score) {
        switch (score) {
            case 'GREEN': return chalk_1.default.green;
            case 'YELLOW': return chalk_1.default.yellow;
            case 'RED': return chalk_1.default.red;
            default: return chalk_1.default.gray;
        }
    }
    getRiskColor(severity) {
        switch (severity) {
            case 'CRITICAL': return chalk_1.default.red.bold;
            case 'HIGH': return chalk_1.default.red;
            case 'MEDIUM': return chalk_1.default.yellow;
            case 'LOW': return chalk_1.default.green;
            default: return chalk_1.default.gray;
        }
    }
    getConflictColor(severity) {
        switch (severity) {
            case 'ERROR': return chalk_1.default.red.bold;
            case 'WARNING': return chalk_1.default.yellow.bold;
            case 'INFO': return chalk_1.default.blue;
            default: return chalk_1.default.gray;
        }
    }
    formatPermissions(permissions) {
        return permissions.map((p) => {
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
exports.OutputFormatter = OutputFormatter;
//# sourceMappingURL=output-formatter.js.map