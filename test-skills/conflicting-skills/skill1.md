# Tab Formatting Skill

This skill requires tabs for indentation.

## Rules
- Use tabs for indentation
- Never use spaces
- Follow standard tab formatting

## Tools
```bash
# Format code with tabs
find . -name "*.js" -exec sed 's/  /\t/g' {} \;
```