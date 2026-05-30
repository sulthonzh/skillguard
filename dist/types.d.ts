export interface SkillFile {
    path: string;
    name: string;
    content: string;
    type: SkillType;
    format: SkillFormat;
}
export interface SkillScanResult {
    skill: SkillFile;
    trustScore: TrustScore;
    permissions: Permission[];
    risks: SecurityRisk[];
    conflicts?: SkillConflict[];
    suggestions?: string[];
}
export interface SkillDiffResult {
    oldSkill: SkillFile;
    newSkill: SkillFile;
    changes: DiffChange[];
    risksAdded: SecurityRisk[];
    risksRemoved: SecurityRisk[];
    conflicts: SkillConflict[];
}
export interface SecurityRisk {
    type: RiskType;
    severity: RiskSeverity;
    description: string;
    pattern?: string;
    line?: number;
    suggestion?: string;
}
export interface SkillConflict {
    type: ConflictType;
    severity: ConflictSeverity;
    description: string;
    affectedSkills: string[];
    suggestion?: string;
}
export interface Permission {
    category: PermissionCategory;
    access: PermissionAccess;
    patterns?: string[];
}
export interface DiffChange {
    type: 'added' | 'removed' | 'modified';
    path: string;
    oldText?: string;
    newText?: string;
    line?: number;
}
export type TrustScore = 'GREEN' | 'YELLOW' | 'RED';
export type SkillType = 'claude' | 'codex' | 'cursor' | 'mcp' | 'custom';
export type SkillFormat = 'markdown' | 'yaml' | 'json';
export type RiskType = 'shell' | 'network' | 'file-write' | 'file-read' | 'secrets' | 'env-vars' | 'api-keys';
export declare enum RiskSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export type RiskSeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ConflictType = 'instruction' | 'tool' | 'priority' | 'permission' | 'redundant';
export type ConflictSeverity = 'INFO' | 'WARNING' | 'ERROR';
export type PermissionCategory = 'filesystem' | 'shell' | 'network' | 'environment' | 'api';
export type PermissionAccess = 'read' | 'write' | 'execute' | 'none';
export interface ScanOptions {
    path: string;
    diff?: {
        oldFile: string;
        newFile: string;
    };
    ci?: boolean;
    quiet?: boolean;
    format?: 'text' | 'json';
}
export interface ScanSummary {
    totalSkills: number;
    greenSkills: number;
    yellowSkills: number;
    redSkills: number;
    totalRisks: number;
    criticalRisks: number;
    totalConflicts: number;
    suggestions: string[];
}
//# sourceMappingURL=types.d.ts.map