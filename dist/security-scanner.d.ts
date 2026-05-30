import { SecurityRisk } from './types';
export declare class SecurityScanner {
    private readonly riskPatterns;
    scan(content: string, filePath?: string): SecurityRisk[];
    private findLine;
    private getSuggestion;
    calculateTrustScore(risks: SecurityRisk[]): 'GREEN' | 'YELLOW' | 'RED';
}
//# sourceMappingURL=security-scanner.d.ts.map