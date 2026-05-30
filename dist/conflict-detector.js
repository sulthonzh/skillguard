"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictDetector = void 0;
class ConflictDetector {
    constructor() {
        this.instructionConflicts = [
            {
                patterns: [
                    /\b(use|require|prefer)\s+(tabs|tabbed|tab\s*indent)/gi,
                    /\b(use|require|prefer)\s+(spaces|spaced|space\s*indent)/gi
                ],
                conflictType: 'instruction',
                severity: 'ERROR',
                description: 'Indentation conflict - tabs vs spaces'
            },
            {
                patterns: [
                    /single quotes?/gi,
                    /double quotes?/gi
                ],
                conflictType: 'instruction',
                severity: 'WARNING',
                description: 'Quote style conflict'
            },
            {
                patterns: [
                    /\b(auto|automatic).*approve/gi,
                    /\b(confirm|prompt|ask).*before/gi
                ],
                conflictType: 'instruction',
                severity: 'ERROR',
                description: 'Approval conflict - auto-approve vs confirmation required'
            }
        ];
        this.toolPatterns = [
            {
                name: 'git commit',
                patterns: [
                    /\bcommit\s+[^-\s]/gi,
                    /\bgit\s+commit\s+/gi,
                    /\"commit\"\s*:/gi
                ]
            },
            {
                name: 'git push',
                patterns: [
                    /\bpush\s+[^-\s]/gi,
                    /\bgit\s+push\s+/gi,
                    /\"push\"\s*:/gi
                ]
            },
            {
                name: 'git pull',
                patterns: [
                    /\bpull\s+[^-\s]/gi,
                    /\bgit\s+pull\s+/gi,
                    /\"pull\"\s*:/gi
                ]
            },
            {
                name: 'npm install',
                patterns: [
                    /\bnpm\s+install\b/gi,
                    /\"npm\"\s*:\s*{\s*\"install\"/gi
                ]
            }
        ];
    }
    detectConflicts(skills) {
        const conflicts = [];
        // Detect instruction conflicts
        conflicts.push(...this.detectInstructionConflicts(skills));
        // Detect tool conflicts
        conflicts.push(...this.detectToolConflicts(skills));
        // Detect redundant skills
        conflicts.push(...this.detectRedundantSkills(skills));
        return conflicts;
    }
    detectInstructionConflicts(skills) {
        const conflicts = [];
        for (const conflictConfig of this.instructionConflicts) {
            const matchingSkills = [];
            skills.forEach(skill => {
                const matches = conflictConfig.patterns.some(pattern => pattern.test(skill.content));
                if (matches) {
                    matchingSkills.push(skill.name);
                }
            });
            if (matchingSkills.length > 1) {
                conflicts.push({
                    type: conflictConfig.conflictType,
                    severity: conflictConfig.severity,
                    description: conflictConfig.description,
                    affectedSkills: matchingSkills,
                    suggestion: this.getConflictSuggestion(conflictConfig.conflictType)
                });
            }
        }
        return conflicts;
    }
    detectToolConflicts(skills) {
        const conflicts = [];
        for (const tool of this.toolPatterns) {
            const skillTools = {};
            skills.forEach(skill => {
                const matches = [];
                tool.patterns.forEach(pattern => {
                    const found = skill.content.match(pattern);
                    if (found) {
                        matches.push(tool.name);
                    }
                });
                if (matches.length > 0) {
                    skillTools[skill.name] = matches;
                }
            });
            // Check if multiple skills register the same tool
            const skillNames = Object.keys(skillTools);
            if (skillNames.length > 1) {
                conflicts.push({
                    type: 'tool',
                    severity: 'WARNING',
                    description: `Tool conflict: multiple skills register '${tool.name}'`,
                    affectedSkills: skillNames,
                    suggestion: `Consider consolidating '${tool.name}' functionality into a single skill or using coordination mechanisms.`
                });
            }
        }
        return conflicts;
    }
    detectRedundantSkills(skills) {
        const conflicts = [];
        // Simple text overlap detection
        for (let i = 0; i < skills.length; i++) {
            for (let j = i + 1; j < skills.length; j++) {
                const skill1 = skills[i];
                const skill2 = skills[j];
                const overlap = this.calculateTextOverlap(skill1.content, skill2.content);
                if (overlap > 0.6) { // 60% overlap threshold
                    conflicts.push({
                        type: 'redundant',
                        severity: 'INFO',
                        description: `High text overlap (${Math.round(overlap * 100)}%) between skills`,
                        affectedSkills: [skill1.name, skill2.name],
                        suggestion: `These skills may be redundant. Consider consolidating them to avoid conflicts and save tokens.`
                    });
                }
            }
        }
        return conflicts;
    }
    calculateTextOverlap(text1, text2) {
        // Simple word overlap calculation
        const words1 = text1.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        const words2 = text2.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }
    getConflictSuggestion(conflictType) {
        const suggestions = {
            instruction: 'Define consistent formatting rules across all skills to avoid agent confusion.',
            tool: 'Use tool aliases or coordination mechanisms to prevent duplicate registrations.',
            priority: 'Order skills consistently and document any priority requirements.',
            permission: 'Standardize permission models across related skills.',
            redundant: 'Consolidate similar skills to reduce complexity and token usage.'
        };
        return suggestions[conflictType] || 'Review skill definitions for consistency.';
    }
}
exports.ConflictDetector = ConflictDetector;
//# sourceMappingURL=conflict-detector.js.map