# Space Formatting Skill

This skill requires spaces for indentation.

## Rules
- Use spaces for indentation
- Never use tabs
- Follow 4-space indentation standard

## Tools
```bash
# Format code with spaces
find . -name "*.js" -exec sed 's/\t/    /g' {} \;
```