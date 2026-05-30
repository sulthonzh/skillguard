import { SkillDetector } from '../skill-detector';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('SkillDetector', () => {
  let detector: SkillDetector;

  beforeEach(() => {
    detector = new SkillDetector();
    mockFs.existsSync.mockClear();
    mockFs.statSync.mockClear();
    mockFs.readFileSync.mockClear();
  });

  describe('detectSkills with single file', () => {
    test('detects Claude skill by filename', async () => {
      const mockStats = { isFile: () => true };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue(mockStats as any);
      mockFs.readFileSync.mockReturnValue('SKILL: name: "Test"');

      const skills = await detector.detectSkills('./SKILL.md');
      
      expect(skills).toHaveLength(1);
      expect(skills[0].type).toBe('claude');
      expect(skills[0].format).toBe('markdown');
      expect(skills[0].name).toBe('SKILL.md');
    });

    test('detects Codex skill by JSON extension', async () => {
      const mockStats = { isFile: () => true };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue(mockStats as any);
      mockFs.readFileSync.mockReturnValue('{"tools": []}');

      const skills = await detector.detectSkills('./skill.json');
      
      expect(skills).toHaveLength(1);
      expect(skills[0].type).toBe('codex');
      expect(skills[0].format).toBe('json');
    });

    test('detects Cursor skill by filename', async () => {
      const mockStats = { isFile: () => true };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue(mockStats as any);
      mockFs.readFileSync.mockReturnValue('shell: echo "test"');

      const skills = await detector.detectSkills('./rule.md');
      
      expect(skills).toHaveLength(1);
      expect(skills[0].type).toBe('cursor');
      expect(skills[0].format).toBe('markdown');
    });

    test('detects MCP skill by filename', async () => {
      const mockStats = { isFile: () => true };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue(mockStats as any);
      mockFs.readFileSync.mockReturnValue('tools: []');

      const skills = await detector.detectSkills('./mcp.yaml');
      
      expect(skills).toHaveLength(1);
      expect(skills[0].type).toBe('mcp');
      expect(skills[0].format).toBe('yaml');
    });

    test('throws error for non-existent file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(detector.detectSkills('./nonexistent.md')).rejects.toThrow(
        'Path does not exist'
      );
    });

    test('skips invalid skill files', async () => {
      const mockStats = { isFile: () => true };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue(mockStats as any);
      mockFs.readFileSync.mockReturnValue('This is not a skill file');

      const skills = await detector.detectSkills('./invalid.md');
      
      expect(skills).toHaveLength(0);
    });
  });

  describe('detectSkills with directory', () => {
    test('scans directory and finds multiple skills', async () => {
      const mockDirStats = { isFile: () => false, isDirectory: () => true };
      
      // Mock glob to return some files
      const originalGlob = (await import('glob')).glob;
      (await import('glob')).glob = jest.fn(async (): Promise<string[]> => [
        '/path/to/skill1.md',
        '/path/to/skill2.json',
        '/path/to/invalid.txt'
      ]);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue(mockDirStats as any);
      
      // Mock file reads
      mockFs.readFileSync
        .mockReturnValueOnce('SKILL: name: "Test1"')
        .mockReturnValueOnce('{"tools": []}')
        .mockReturnValueOnce('Not a skill');

      const skills = await detector.detectSkills('./skills');
      
      expect(skills.length).toBeGreaterThan(0);
      expect(skills.some(s => s.name === 'skill1.md')).toBe(true);
      expect(skills.some(s => s.name === 'skill2.json')).toBe(true);

      // Restore original glob
      (await import('glob')).glob = originalGlob;
    });

    test('throws error for invalid path type', async () => {
      // Create a mock that's neither file nor directory
      const mockInvalidStats = { 
        isFile: () => false, 
        isDirectory: () => false 
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue(mockInvalidStats as any);

      await expect(detector.detectSkills('./invalid')).rejects.toThrow(
        'Invalid path type'
      );
    });
  });

  describe('skill validation', () => {
    test('validates proper skill patterns', () => {
      const validSkills = [
        { content: 'TOOL_DEFINITION: name: "test"' },
        { content: 'shell: echo "test"' },
        { content: '```bash\necho "test"\n```' },
        { content: 'tools: []' }
      ];

      validSkills.forEach(skill => {
        expect((detector as any).validateSkill(skill)).toBe(true);
      });
    });

    test('rejects empty content', () => {
      expect((detector as any).validateSkill({ content: '' })).toBe(false);
      expect((detector as any).validateSkill({ content: '   \n   \t   ' })).toBe(false);
    });

    test('rejects non-skill content', () => {
      expect((detector as any).validateSkill({ content: 'Just regular text' })).toBe(false);
    });
  });
});