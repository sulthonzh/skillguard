'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Markdown skill file section definitions
 */
const MD_SECTIONS = {
  name: {
    required: true,
    patterns: /name|tool\s*name/i,
    description: 'Skill/tool name',
    validate(content) {
      if (!content.trim()) return { valid: false, message: 'Name section is empty' };
      const lines = content.trim().split('\n').filter(l => l.trim());
      if (lines.length === 0) return { valid: false, message: 'No name found' };
      const name = lines[0].replace(/^[-*`#\s]+/, '').replace(/`/g, '').trim();
      if (name.length < 2) return { valid: false, message: `Name too short: "${name}"` };
      if (name.length > 64) return { valid: false, message: `Name too long (${name.length} chars)` };
      return { valid: true };
    }
  },
  description: {
    required: true,
    patterns: /description|overview|about|summary/i,
    description: 'What the skill does',
    validate(content) {
      if (!content.trim()) return { valid: false, message: 'Description is empty' };
      if (content.trim().length < 20) return { valid: false, message: `Description too short (${content.trim().length} chars). Aim for 50+.` };
      return { valid: true };
    }
  },
  usage: {
    required: true,
    patterns: /usage|how\s+to\s+use|example|getting\s+started/i,
    description: 'How to use the skill',
    validate(content) {
      if (!content.trim()) return { valid: false, message: 'Usage section is empty' };
      if (!/```|    |\t/.test(content)) return { valid: false, message: 'Usage should include code examples' };
      return { valid: true };
    }
  },
  parameters: {
    required: false,
    patterns: /parameters?|inputs?|arguments?|options?|config/i,
    description: 'Input parameters and options'
  },
  behavior: {
    required: false,
    patterns: /behavior|rules?|instructions?|how\s+it\s+works/i,
    description: 'Behavioral rules and instructions'
  },
  constraints: {
    required: false,
    patterns: /constraints?|limitations?|restrictions?|boundaries?/i,
    description: 'Constraints and limitations'
  },
  dependencies: {
    required: false,
    patterns: /dependencies?|requirements?|prerequisites?|needs?/i,
    description: 'Required dependencies or tools'
  },
  examples: {
    required: false,
    patterns: /examples?|demos?|sample/i,
    description: 'Usage examples'
  },
  errors: {
    required: false,
    patterns: /errors?|troubleshoot|error\s+handling/i,
    description: 'Error handling documentation'
  }
};

/**
 * Parse headings from markdown content
 */
function parseHeadings(content) {
  const lines = content.split('\n');
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim(), lineIdx: i });
    }
  }
  return headings;
}

/**
 * Extract sections from markdown
 */
function extractSections(content) {
  const headings = parseHeadings(content);
  const lines = content.split('\n');
  const sections = {};

  for (const [key, def] of Object.entries(MD_SECTIONS)) {
    const match = headings.find(h => def.patterns.test(h.text));
    if (match) {
      let sectionContent = '';
      for (let i = match.lineIdx + 1; i < lines.length; i++) {
        const h = lines[i].match(/^(#{1,6})\s+(.+)/);
        if (h && h[1].length <= match.level) break;
        sectionContent += lines[i] + '\n';
      }
      sections[key] = { found: true, heading: match.text, line: match.lineIdx + 1, content: sectionContent.trim() };
    } else {
      sections[key] = { found: false };
    }
  }

  return sections;
}

/**
 * Validate a markdown skill file
 */
function validateMarkdown(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return { error: `File not found: ${resolved}` };
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const ext = path.extname(resolved).toLowerCase();

  if (!['.md', '.markdown'].includes(ext)) {
    return { error: `Unsupported file type: ${ext}. Only .md files supported.` };
  }

  const sections = extractSections(content);
  const errors = [];
  const warnings = [];
  const info = [];

  for (const [key, def] of Object.entries(MD_SECTIONS)) {
    const sec = sections[key];
    if (def.required && !sec.found) {
      errors.push({ field: key, message: `Missing required section: ${def.description}`, severity: 'error' });
    } else if (sec.found) {
      if (def.validate) {
        const result = def.validate(sec.content);
        if (!result.valid) {
          if (def.required) {
            errors.push({ field: key, message: result.message, severity: 'error' });
          } else {
            warnings.push({ field: key, message: result.message, severity: 'warning' });
          }
        } else {
          info.push({ field: key, message: `✓ ${def.description}`, severity: 'info' });
        }
      } else {
        info.push({ field: key, message: `✓ Has ${def.description}`, severity: 'info' });
      }
    } else if (!def.required) {
      info.push({ field: key, message: `Optional: ${def.description}`, severity: 'info' });
    }
  }

  // Score: required sections worth 20pts each (60 max), optional 5pts each (40 max)
  let score = 0;
  const requiredKeys = ['name', 'description', 'usage'];
  for (const key of requiredKeys) {
    const sec = sections[key];
    if (sec.found) {
      const def = MD_SECTIONS[key];
      if (def.validate) {
        const result = def.validate(sec.content);
        score += result.valid ? 20 : 10;
      } else {
        score += 20;
      }
    }
  }

  const optionalKeys = ['parameters', 'behavior', 'constraints', 'dependencies', 'examples', 'errors'];
  for (const key of optionalKeys) {
    if (sections[key].found && sections[key].content) score += 5;
  }

  score = Math.min(score, 100);

  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 65) grade = 'C';
  else if (score >= 50) grade = 'D';
  else grade = 'F';

  return {
    errors,
    warnings,
    info,
    grade,
    points: score,
    max: 100,
    file: resolved,
    sections,
    lineCount: content.split('\n').length,
    headingCount: parseHeadings(content).length,
    byteSize: Buffer.byteLength(content, 'utf-8')
  };
}

module.exports = { validateMarkdown, extractSections, parseHeadings, MD_SECTIONS };
