'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Parse a skill file (JSON or YAML-ish)
 */
function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    return JSON.parse(content);
  }

  // Simple YAML-like parser for .yaml/.yml files
  if (ext === '.yaml' || ext === '.yml') {
    return parseSimpleYaml(content);
  }

  // Try JSON first, then YAML
  try {
    return JSON.parse(content);
  } catch {
    return parseSimpleYaml(content);
  }
}

/**
 * Minimal YAML parser — handles flat + one-level nested structures
 */
function parseSimpleYaml(content) {
  const result = {};
  const lines = content.split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Array item
    if (trimmed.startsWith('- ') && currentArray) {
      const val = trimmed.slice(2).trim();
      if (val.startsWith('"') || val.startsWith("'")) {
        result[currentKey].push(val.slice(1, -1));
      } else {
        result[currentKey].push(coerceYamlValue(val));
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();

    if (val === '' || val === '|' || val === '>') {
      // Next lines could be array or nested
      if (val === '' || val === '|' || val === '>') {
        result[key] = [];
        currentKey = key;
        currentArray = true;
      }
      continue;
    }

    currentArray = null;
    currentKey = null;

    if (val.startsWith('"') || val.startsWith("'")) {
      result[key] = val.slice(1, -1);
    } else if (val.startsWith('[') && val.endsWith(']')) {
      result[key] = val.slice(1, -1).split(',').map(s => coerceYamlValue(s.trim()));
    } else if (val === 'null') {
      result[key] = null;
    } else {
      result[key] = coerceYamlValue(val);
    }
  }

  return result;
}

function coerceYamlValue(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null') return null;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  if (val.startsWith('"') || val.startsWith("'")) return val.slice(1, -1);
  return val;
}

/**
 * Validate a single skill definition
 */
function validateSkill(skill, _options = {}) {
  const errors = [];
  const warnings = [];
  const info = [];

  // 1. Required fields
  const required = ['name', 'version', 'description'];
  for (const field of required) {
    if (!skill[field]) {
      errors.push({ field, message: `Required field "${field}" is missing`, severity: 'error' });
    }
  }

  // 2. Name conventions
  if (skill.name) {
    if (!/^[a-z][a-z0-9-]*$/.test(skill.name)) {
      warnings.push({
        field: 'name',
        message: 'Name should be lowercase with hyphens (e.g. "my-skill")',
        severity: 'warning'
      });
    }
    if (skill.name.length > 64) {
      warnings.push({
        field: 'name',
        message: 'Name is too long (max 64 chars recommended)',
        severity: 'warning'
      });
    }
  }

  // 3. Version is semver
  if (skill.version) {
    if (!/^\d+\.\d+\.\d+/.test(skill.version)) {
      errors.push({
        field: 'version',
        message: 'Version must follow semver (e.g. "1.0.0")',
        severity: 'error'
      });
    }
  }

  // 4. Description quality
  if (skill.description) {
    if (skill.description.length < 10) {
      warnings.push({
        field: 'description',
        message: 'Description is too short — be descriptive',
        severity: 'warning'
      });
    }
    if (skill.description.length > 500) {
      warnings.push({
        field: 'description',
        message: 'Description is too long — keep it under 500 chars',
        severity: 'warning'
      });
    }
  }

  // 5. Tools array
  if (skill.tools !== undefined) {
    if (!Array.isArray(skill.tools)) {
      errors.push({
        field: 'tools',
        message: 'Tools must be an array',
        severity: 'error'
      });
    } else {
      for (let i = 0; i < skill.tools.length; i++) {
        if (typeof skill.tools[i] !== 'string' || skill.tools[i].trim() === '') {
          errors.push({
            field: `tools[${i}]`,
            message: 'Tool reference must be a non-empty string',
            severity: 'error'
          });
        }
      }
      if (skill.tools.length === 0) {
        info.push({
          field: 'tools',
          message: 'No tools defined — skill may not be very useful',
          severity: 'info'
        });
      }
    }
  }

  // 6. Input schema
  if (skill.input !== undefined) {
    if (typeof skill.input !== 'object' || Array.isArray(skill.input)) {
      errors.push({
        field: 'input',
        message: 'Input must be an object (JSON Schema)',
        severity: 'error'
      });
    } else {
      if (!skill.input.type) {
        warnings.push({
          field: 'input.type',
          message: 'Input schema should have a "type" field',
          severity: 'warning'
        });
      }
    }
  }

  // 7. Output schema
  if (skill.output !== undefined) {
    if (typeof skill.output !== 'object' || Array.isArray(skill.output)) {
      errors.push({
        field: 'output',
        message: 'Output must be an object (JSON Schema)',
        severity: 'error'
      });
    } else {
      if (!skill.output.type) {
        warnings.push({
          field: 'output.type',
          message: 'Output schema should have a "type" field',
          severity: 'warning'
        });
      }
    }
  }

  // 10. Config validation
  if (skill.config !== undefined) {
    if (typeof skill.config !== 'object' || Array.isArray(skill.config)) {
      errors.push({
        field: 'config',
        message: 'Config must be an object',
        severity: 'error'
      });
    } else {
      if (skill.config.timeout !== undefined) {
        if (typeof skill.config.timeout !== 'number' || skill.config.timeout <= 0) {
          warnings.push({
            field: 'config.timeout',
            message: 'Timeout should be a positive number (ms)',
            severity: 'warning'
          });
        }
      }
      if (skill.config.retries !== undefined) {
        if (typeof skill.config.retries !== 'number' || skill.config.retries < 0) {
          warnings.push({
            field: 'config.retries',
            message: 'Retries should be a non-negative number',
            severity: 'warning'
          });
        }
      }
    }
  }

  return { errors, warnings, info };
}

/**
 * Check for duplicate names across skills
 */
function checkDuplicates(skills) {
  const errors = [];
  const names = new Map();

  for (const { skill, filePath } of skills) {
    if (skill.name) {
      if (names.has(skill.name)) {
        errors.push({
          field: 'name',
          message: `Duplicate skill name "${skill.name}" found in ${filePath} and ${names.get(skill.name)}`,
          severity: 'error'
        });
      } else {
        names.set(skill.name, filePath);
      }
    }
  }

  return errors;
}

/**
 * Check for circular dependencies
 */
function checkCircular(skills) {
  const errors = [];
  const nameMap = new Map();
  for (const { skill } of skills) {
    if (skill.name) nameMap.set(skill.name, skill);
  }

  const visited = new Set();
  const stack = new Set();

  function dfs(name) {
    if (stack.has(name)) return true; // cycle
    if (visited.has(name)) return false;
    visited.add(name);
    stack.add(name);

    const skill = nameMap.get(name);
    if (skill && Array.isArray(skill.dependencies)) {
      for (const dep of skill.dependencies) {
        if (nameMap.has(dep) && dfs(dep)) {
          errors.push({
            field: 'dependencies',
            message: `Circular dependency detected involving "${name}"`,
            severity: 'error'
          });
          return true;
        }
      }
    }

    stack.delete(name);
    return false;
  }

  for (const { skill } of skills) {
    if (skill.name) {
      visited.clear();
      stack.clear();
      dfs(skill.name);
    }
  }

  // Deduplicate
  const seen = new Set();
  return errors.filter(e => {
    const key = e.message;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Score a validation result
 */
function score(validationResult) {
  const { errors, warnings } = validationResult;
  let points = 100;

  // Errors are heavy penalties
  points -= errors.length * 20;
  // Warnings are lighter
  points -= warnings.length * 5;
  // Info is neutral

  points = Math.max(0, Math.min(100, points));

  let grade;
  if (points >= 90) grade = 'A';
  else if (points >= 80) grade = 'B';
  else if (points >= 70) grade = 'C';
  else if (points >= 60) grade = 'D';
  else grade = 'F';

  return { grade, points, max: 100 };
}

/**
 * Validate a single file
 */
function validate(filePath, options = {}) {
  const resolved = path.resolve(filePath);
  const skill = parseFile(resolved);
  const result = validateSkill(skill, options);
  const sc = score(result);
  return { ...result, ...sc, skill, filePath: resolved };
}

/**
 * Validate all skill files in a directory
 */
function validateDir(dirPath, options = {}) {
  const resolved = path.resolve(dirPath);
  const entries = fs.readdirSync(resolved);
  const exts = ['.json', '.yaml', '.yml'];

  const skills = [];
  for (const entry of entries) {
    if (exts.includes(path.extname(entry).toLowerCase())) {
      const fullPath = path.join(resolved, entry);
      try {
        const skill = parseFile(fullPath);
        skills.push({ skill, filePath: fullPath });
      } catch (err) {
        skills.push({
          skill: {},
          filePath: fullPath,
          parseError: err.message
        });
      }
    }
  }

  // Per-skill validation
  const results = skills.map(({ skill, filePath, parseError }) => {
    if (parseError) {
      return {
        errors: [{ field: '-', message: `Parse error: ${parseError}`, severity: 'error' }],
        warnings: [],
        info: [],
        grade: 'F',
        points: 0,
        max: 100,
        skill,
        filePath
      };
    }

    const result = validateSkill(skill, options);
    const sc = score(result);
    return { ...result, ...sc, skill, filePath };
  });

  // Cross-skill checks
  const validSkills = skills.filter(s => !s.parseError);
  const dupErrors = checkDuplicates(validSkills);
  const circErrors = checkCircular(validSkills);

  // Attach cross-skill errors to first result
  if (results.length > 0) {
    results[0].errors.push(...dupErrors, ...circErrors);
    // Rescore first result
    const sc = score(results[0]);
    results[0].grade = sc.grade;
    results[0].points = sc.points;
  }

  const overall = score({
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings),
    info: results.flatMap(r => r.info)
  });

  return { results, overall };
}

module.exports = { validate, validateDir, validateSkill, score, parseFile, checkDuplicates, checkCircular };
