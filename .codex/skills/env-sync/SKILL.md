---
name: env-sync
description: Compare environment variables referenced in code against example env files.
---

# Env Sync

Use this skill when the user asks to verify environment-variable drift between code and `.env.example` files.

## Inspect references

Frontend:

```bash
rg -o 'process\\.env\\.[A-Z0-9_]+' src -g'*.ts' -g'*.tsx' | sed 's/.*process\\.env\\.//' | sort -u
```

Backend:

```bash
rg -o 'process\\.env\\.[A-Z0-9_]+' backend/src -g'*.ts' | sed 's/.*process\\.env\\.//' | sort -u
```

## Compare with examples

Frontend:

```bash
grep -v '^#' .env.example 2>/dev/null | grep '=' | cut -d= -f1 | sort -u
```

Backend:

```bash
grep -v '^#' backend/.env.example 2>/dev/null | grep '=' | cut -d= -f1 | sort -u
```

## Report

Call out:
- Variables referenced in code but missing from example files
- Variables present in example files but unused in code
- Hardcoded secret-like literals
- `.env` / key-file ignore hygiene
