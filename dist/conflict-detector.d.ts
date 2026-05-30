import { SkillFile, SkillConflict } from './types';
export declare class ConflictDetector {
    private readonly instructionConflicts;
    private readonly toolPatterns;
    detectConflicts(skills: SkillFile[]): SkillConflict[];
    private detectInstructionConflicts;
    private detectToolConflicts;
    private detectRedundantSkills;
    private calculateTextOverlap;
    private getConflictSuggestion;
}
//# sourceMappingURL=conflict-detector.d.ts.map