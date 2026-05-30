import { ConflictDetector } from '../conflict-detector';
import { SkillFile, SkillType, SkillFormat } from '../types';

describe('ConflictDetector', () => {
  let detector: ConflictDetector;

  beforeEach(() => {
    detector = new ConflictDetector();
  });

  const createSkill = (name: string, content: string, type: SkillType = 'custom'): SkillFile => ({
    path: `/path/to/${name}`,
    name,
    content,
    type,
    format: 'markdown'
  });

  describe('instruction conflicts', () => {
    test('detects tab vs space conflicts', () => {
      const skills = [
        createSkill('tabs-skill', 'Use tabs for indentation'),
        createSkill('spaces-skill', 'Use spaces for indentation')
      ];

      const conflicts = detector.detectConflicts(skills);
      
      const instructionConflicts = conflicts.filter(c => c.type === 'instruction');
      expect(instructionConflicts.length).toBeGreaterThan(0);
      expect(instructionConflicts[0].severity).toBe('ERROR');
      expect(instructionConflicts[0].affectedSkills).toContain('tabs-skill');
      expect(instructionConflicts[0].affectedSkills).toContain('spaces-skill');
    });

    test('detects quote style conflicts', () => {
      const skills = [
        createSkill('single-quotes', 'Use single quotes for strings'),
        createSkill('double-quotes', 'Use double quotes for strings')
      ];

      const conflicts = detector.detectConflicts(skills);
      
      const quoteConflicts = conflicts.filter(c => 
        c.description.toLowerCase().includes('quote')
      );
      expect(quoteConflicts.length).toBeGreaterThan(0);
    });

    test('detects approval conflicts', () => {
      const skills = [
        createSkill('auto-approve', 'Auto-approve all changes'),
        createSkill('confirm-first', 'Always confirm before making changes')
      ];

      const conflicts = detector.detectConflicts(skills);
      
      const approvalConflicts = conflicts.filter(c => 
        c.description.toLowerCase().includes('approve')
      );
      expect(approvalConflicts.length).toBeGreaterThan(0);
    });
  });

  describe('tool conflicts', () => {
    test('detects duplicate git commit tools', () => {
      const skills = [
        createSkill('git-auto-commit', 'git commit -m "Auto commit"'),
        createSkill('git-workflow', 'git commit -m "Workflow commit"')
      ];

      const conflicts = detector.detectConflicts(skills);
      
      const toolConflicts = conflicts.filter(c => c.type === 'tool');
      expect(toolConflicts.length).toBeGreaterThan(0);
      expect(toolConflicts[0].affectedSkills).toContain('git-auto-commit');
      expect(toolConflicts[0].affectedSkills).toContain('git-workflow');
    });

    test('detects duplicate npm install tools', () => {
      const skills = [
        createSkill('npm-install', 'npm install'),
        createSkill('deps-skill', '"npm": { "install": true }')
      ];

      const conflicts = detector.detectConflicts(skills);
      
      const toolConflicts = conflicts.filter(c => c.type === 'tool');
      expect(toolConflicts.length).toBeGreaterThan(0);
    });
  });

  describe('redundant skill detection', () => {
    test('detects high text overlap', () => {
      const skill1 = createSkill('similar1', 'This skill handles git operations and commits');
      const skill2 = createSkill('similar2', 'This skill manages git commits and operations');
      
      const skills = [skill1, skill2];
      const conflicts = detector.detectConflicts(skills);
      
      const redundantConflicts = conflicts.filter(c => c.type === 'redundant');
      expect(redundantConflicts.length).toBeGreaterThan(0);
      expect(redundantConflicts[0].affectedSkills).toContain('similar1');
      expect(redundantConflicts[0].affectedSkills).toContain('similar2');
    });

    test('does not flag low overlap skills', () => {
      const skill1 = createSkill('git-skill', 'Handles git operations and version control');
      const skill2 = createSkill('docker-skill', 'Manages Docker containers and images');
      
      const skills = [skill1, skill2];
      const conflicts = detector.detectConflicts(skills);
      
      const redundantConflicts = conflicts.filter(c => c.type === 'redundant');
      expect(redundantConflicts.length).toBe(0);
    });
  });

  describe('text overlap calculation', () => {
    test('calculates high overlap for similar content', () => {
      const text1 = 'This skill handles git operations and version control systems';
      const text2 = 'This skill manages git operations and version control';
      
      const overlap = (detector as any).calculateTextOverlap(text1, text2);
      expect(overlap).toBeGreaterThan(0.5); // Should be > 50%
    });

    test('calculates low overlap for different content', () => {
      const text1 = 'Git operations and version control';
      const text2 = 'Docker containers and image management';
      
      const overlap = (detector as any).calculateTextOverlap(text1, text2);
      expect(overlap).toBeLessThan(0.2); // Should be < 20%
    });
  });
});