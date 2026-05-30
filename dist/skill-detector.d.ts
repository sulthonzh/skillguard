import { SkillFile } from './types';
export declare class SkillDetector {
    private readonly skillPatterns;
    detectSkills(inputPath: string): Promise<SkillFile[]>;
    private scanDirectory;
    private parseSkillFile;
    private validateSkill;
}
//# sourceMappingURL=skill-detector.d.ts.map