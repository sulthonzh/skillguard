import { SecurityRisk, RiskType, RiskSeverity } from './types';

export class SecurityScanner {
  private readonly riskPatterns = {
    // Shell execution patterns
    shell: [
      {
        pattern: /\$\([^)]*\)/g,           // Command substitution: $(cmd)
        severity: 'CRITICAL' as RiskSeverity,
        description: 'Command substitution - potential code execution'
      },
      {
        pattern: /`[^`]*`/g,              // Backticks: `cmd`
        severity: 'CRITICAL' as RiskSeverity,
        description: 'Backtick execution - potential code execution'
      },
      {
        pattern: /\b(exec|eval|system)\b/gi,
        severity: 'CRITICAL' as RiskSeverity,
        description: 'Direct execution functions'
      },
      {
        pattern: /\bnode\s+-e\s+["\'][^"\']*["\']/g,
        severity: 'HIGH' as RiskSeverity,
        description: 'Node.js command execution'
      }
    ],

    // Network access patterns
    network: [
      {
        pattern: /\bcurl\s+/gi,
        severity: 'MEDIUM' as RiskSeverity,
        description: 'curl command - external network access'
      },
      {
        pattern: /\bwget\s+/gi,
        severity: 'MEDIUM' as RiskSeverity,
        description: 'wget command - external network access'
      },
      {
        pattern: /\bfetch\s*\(/gi,
        severity: 'MEDIUM' as RiskSeverity,
        description: 'JavaScript fetch API - external network access'
      },
      {
        pattern: /\baxios\s*\(/gi,
        severity: 'MEDIUM' as RiskSeverity,
        description: 'Axios HTTP client - external network access'
      },
      {
        pattern: /\bhttp[s]?:\/\/\S+/gi,
        severity: 'LOW' as RiskSeverity,
        description: 'HTTP/HTTPS URLs - potential network calls'
      }
    ],

    // File write access patterns
    fileWrite: [
      {
        pattern: />\s*[^>]*$/gm,           // Output redirection: > file
        severity: 'HIGH' as RiskSeverity,
        description: 'File output redirection - potential data loss'
      },
      {
        pattern: />>\s*[^>]*$/gm,          // Append redirection: >> file
        severity: 'MEDIUM' as RiskSeverity,
        description: 'File append redirection'
      },
      {
        pattern: /\bwriteFile\s*\(/gi,
        severity: 'HIGH' as RiskSeverity,
        description: 'File write operation'
      },
      {
        pattern: /\brequire\(.*fs.*\)/gi,
        severity: 'LOW' as RiskSeverity,
        description: 'File system access'
      }
    ],

    // File read access patterns
    fileRead: [
      {
        pattern: /\bcat\s+\S+/gi,
        severity: 'LOW' as RiskSeverity,
        description: 'File reading via cat'
      },
      {
        pattern: /\brequire\(.*\)/gi,
        severity: 'LOW' as RiskSeverity,
        description: 'File/module import'
      }
    ],

    // Secrets and sensitive data
    secrets: [
      {
        pattern: /\b(api[_-]?key|secret|token|password|pass|pwd)\b.*[:=]\s*["\'][^"']{10,}["\']/gi,
        severity: 'CRITICAL' as RiskSeverity,
        description: 'Hardcoded credentials or API keys'
      },
      {
        pattern: /\bAKIA[A-Z0-9]{16,}\b/g,
        severity: 'CRITICAL' as RiskSeverity,
        description: 'AWS Access Key ID'
      },
      {
        pattern: /\bghp_[a-zA-Z0-9]{36}\b/g,
        severity: 'CRITICAL' as RiskSeverity,
        description: 'GitHub personal access token'
      }
    ],

    // Environment variables
    envVars: [
      {
        pattern: /\$\{[^}]+\}/g,            // ${VAR}
        severity: 'MEDIUM' as RiskSeverity,
        description: 'Environment variable expansion'
      },
      {
        pattern: /\$[A-Z_][A-Z0-9_]*/gi,   // $VAR
        severity: 'MEDIUM' as RiskSeverity,
        description: 'Environment variable access'
      }
    ]
  };

  scan(content: string, filePath?: string): SecurityRisk[] {
    const risks: SecurityRisk[] = [];
    const lines = content.split('\n');

    for (const [riskType, patterns] of Object.entries(this.riskPatterns)) {
      for (const patternConfig of patterns) {
        const matches = content.match(patternConfig.pattern);
        
        if (matches) {
          for (const match of matches) {
            const line = this.findLine(content, match);
            risks.push({
              type: riskType as RiskType,
              severity: patternConfig.severity,
              description: patternConfig.description,
              pattern: match,
              line,
              suggestion: this.getSuggestion(riskType as RiskType)
            });
          }
        }
      }
    }

    return risks;
  }

  private findLine(content: string, pattern: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pattern)) {
        return i + 1; // 1-indexed line numbers
      }
    }
    return -1; // Return -1 instead of undefined
  }

  private getSuggestion(riskType: RiskType): string {
    const suggestions: Record<string, string> = {
      shell: 'Avoid shell execution in skills. Use built-in tools or document required permissions.',
      network: 'Network access may expose your environment. Consider offline alternatives.',
      'file-write': 'File writes can cause data loss. Use readonly permissions when possible.',
      'file-read': 'File access may expose sensitive data. Limit to necessary files only.',
      secrets: 'Never hardcode credentials. Use environment variables or secure storage.',
      'env-vars': 'Environment variable access can affect skill behavior unexpectedly.',
      'api-keys': 'Never hardcode API keys. Use environment variables or secure storage.'
    };

    return suggestions[riskType] || 'Review this pattern for potential security implications.';
  }

  calculateTrustScore(risks: SecurityRisk[]): 'GREEN' | 'YELLOW' | 'RED' {
    const criticalRisks = risks.filter(r => r.severity === 'CRITICAL').length;
    const highRisks = risks.filter(r => r.severity === 'HIGH').length;
    const mediumRisks = risks.filter(r => r.severity === 'MEDIUM').length;

    if (criticalRisks > 0) {
      return 'RED';
    } else if (highRisks > 0 || mediumRisks > 2) {
      return 'YELLOW';
    } else {
      return 'GREEN';
    }
  }
}