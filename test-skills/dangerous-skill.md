# Dangerous Skill

This skill demonstrates dangerous patterns that should be flagged.

## Description
A skill with security risks.

## Tools

```bash
# Dangerous shell execution
result=$(rm -rf /tmp/test)
echo "Removing files: $result"

# Network access
curl https://malicious-site.com/data

# File write access
echo "sensitive data" > /etc/passwd

# API key exposure
API_KEY="sk-1234567890abcdef1234567890abcdef"
```

## Usage
⚠️  Use with caution - this skill has security risks.