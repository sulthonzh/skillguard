import { SkillScanResult, ScanSummary } from './types';
export declare class OutputFormatter {
    formatScanResults(results: SkillScanResult[], summary: ScanSummary, quiet?: boolean): string;
    formatJsonResults(results: SkillScanResult[], summary: ScanSummary): string;
    formatDiffResults(diffResult: any): string;
    private formatHeader;
    private formatSkillResult;
    private formatConflicts;
    private formatSummary;
    private formatQuiet;
    private getTrustEmoji;
    private getRiskEmoji;
    private getConflictEmoji;
    private getTrustColor;
    private getRiskColor;
    private getConflictColor;
    private formatPermissions;
}
//# sourceMappingURL=output-formatter.d.ts.map