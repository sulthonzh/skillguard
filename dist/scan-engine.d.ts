import { SkillScanResult, ScanSummary } from './types';
export declare class ScanEngine {
    private skillDetector;
    private securityScanner;
    private conflictDetector;
    scanSkills(inputPath: string, options?: {
        ci?: boolean;
        quiet?: boolean;
    }): Promise<{
        results: SkillScanResult[];
        summary: ScanSummary;
    }>;
    scanDiff(oldFile: string, newFile: string): Promise<{
        result: any;
        risksAdded: any[];
        risksRemoved: any[];
        conflicts: any[];
    }>;
    private extractPermissions;
    private extractFilePatterns;
    private extractCommandPatterns;
    private extractUrlPatterns;
    private generateSuggestions;
    private generateSummary;
}
//# sourceMappingURL=scan-engine.d.ts.map