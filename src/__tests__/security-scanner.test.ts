import { SecurityScanner } from '../security-scanner';
import { RiskSeverity } from '../types';

describe('SecurityScanner', () => {
  let scanner: SecurityScanner;

  beforeEach(() => {
    scanner = new SecurityScanner();
  });

  describe('shell execution detection', () => {
    test('detects command substitution', () => {
      const content = 'echo "Result: $(ls -la)"';
      const risks = scanner.scan(content);
      
      const shellRisks = risks.filter(r => r.type === 'shell');
      expect(shellRisks.length).toBeGreaterThan(0);
      expect(shellRisks[0].severity).toBe(RiskSeverity.CRITICAL);
      expect(shellRisks[0].description).toContain('Command substitution');
    });

    test('detects backtick execution', () => {
      const content = 'result = `cat file.txt`';
      const risks = scanner.scan(content);
      
      const shellRisks = risks.filter(r => r.type === 'shell');
      expect(shellRisks.length).toBeGreaterThan(0);
      expect(shellRisks[0].severity).toBe(RiskSeverity.CRITICAL);
    });

    test('detects exec functions', () => {
      const content = 'exec("npm install");';
      const risks = scanner.scan(content);
      
      const shellRisks = risks.filter(r => r.type === 'shell');
      expect(shellRisks.length).toBeGreaterThan(0);
      expect(shellRisks[0].severity).toBe(RiskSeverity.CRITICAL);
    });
  });

  describe('network access detection', () => {
    test('detects curl commands', () => {
      const content = 'curl https://api.example.com/data';
      const risks = scanner.scan(content);
      
      const networkRisks = risks.filter(r => r.type === 'network');
      expect(networkRisks.length).toBeGreaterThan(0);
      expect(networkRisks[0].severity).toBe(RiskSeverity.MEDIUM);
    });

    test('detects fetch API calls', () => {
      const content = 'fetch("https://api.github.com/repos/user/repo")';
      const risks = scanner.scan(content);
      
      const networkRisks = risks.filter(r => r.type === 'network');
      expect(networkRisks.length).toBeGreaterThan(0);
      expect(networkRisks[0].severity).toBe(RiskSeverity.MEDIUM);
    });
  });

  describe('file write detection', () => {
    test('detects output redirection', () => {
      const content = 'echo "data" > output.txt';
      const risks = scanner.scan(content);
      
      const fileWriteRisks = risks.filter((r: any) => r.type === 'fileWrite');
      expect(fileWriteRisks.length).toBeGreaterThan(0);
      expect(fileWriteRisks[0].severity).toBe(RiskSeverity.HIGH);
    });

    test('detects append redirection', () => {
      const content = 'echo "data" >> log.txt';
      const risks = scanner.scan(content);
      
      const appendRisks = risks.filter((r: any) => r.description.includes('append'));
      expect(appendRisks.length).toBeGreaterThan(0);
      expect(appendRisks[0].severity).toBe(RiskSeverity.MEDIUM);
    });
  });

  describe('secrets detection', () => {
    test('detects hardcoded API keys', () => {
      const content = 'const apiKey = "sk-1234567890abcdef1234567890abcdef"';
      const risks = scanner.scan(content);
      
      const secretsRisks = risks.filter(r => r.type === 'secrets');
      expect(secretsRisks.length).toBeGreaterThan(0);
      expect(secretsRisks[0].severity).toBe(RiskSeverity.CRITICAL);
    });

    test('detects AWS access keys', () => {
      const content = 'REDACTED_AWS_EXAMPLE';
      const risks = scanner.scan(content);
      
      const secretsRisks = risks.filter(r => r.type === 'secrets');
      expect(secretsRisks.length).toBeGreaterThan(0);
      expect(secretsRisks[0].severity).toBe(RiskSeverity.CRITICAL);
    });
  });

  describe('trust score calculation', () => {
    test('returns GREEN for safe skills', () => {
      const safeContent = 'Read file contents and analyze them';
      const risks = scanner.scan(safeContent);
      const trustScore = scanner.calculateTrustScore(risks);
      
      expect(trustScore).toBe('GREEN');
    });

    test('returns YELLOW for medium-risk skills', () => {
      const mediumRiskContent = 'curl https://api.example.com && echo "test" >> file.txt';
      const risks = scanner.scan(mediumRiskContent);
      const trustScore = scanner.calculateTrustScore(risks);
      
      expect(trustScore).toBe('YELLOW');
    });

    test('returns RED for critical-risk skills', () => {
      const criticalRiskContent = 'result = `$(rm -rf /)`';
      const risks = scanner.scan(criticalRiskContent);
      const trustScore = scanner.calculateTrustScore(risks);
      
      expect(trustScore).toBe('RED');
    });
  });

  describe('line number detection', () => {
    test('identifies correct line numbers', () => {
      const content = `Line 1: safe code
Line 2: dangerous code $(rm -rf /)
Line 3: more safe code`;
      const risks = scanner.scan(content);
      
      const shellRisk = risks.find(r => r.type === 'shell');
      expect(shellRisk?.line).toBe(2);
    });
  });
});