# AGENTS.md

This file provides guidance to AI agents working in this repository.

## Rules & Documentation

**Global Claude Code settings** (`~/.claude/CLAUDE.md`) apply first. Project rules below supplement and may override global settings for project-specific needs.

| Priority | Purpose | File |
|----------|---------|------|
| 1 (global) | Claude Code global configuration | `~/.claude/CLAUDE.md` |
| 2 | Project-wide rules, commands, git/PR workflow | `CLAUDE.md` |
| 3 | Backend patterns, DB, security, testing | `backend/CLAUDE.md` |
| 4 | Frontend patterns, UI, accessibility | `src/CLAUDE.md` |
| 5 | Architecture decisions | `.claude/rules/architecture.md` |
| 6 | Code style (cross-cutting) | `.claude/rules/code-style.md` |
| 7 | Git/PR/Issue workflow | `.claude/rules/git-workflow.md` |
| 8 | DB migration rules | `.claude/rules/database.md` |
| 9 | Security rules | `.claude/rules/security.md` |
| 10 | Deployment rules | `.claude/rules/deployment.md` |
| - | Design system | `DESIGN.md` |

**Available skills** (invoke via `/skill` or keyword triggers):
- `/ship` — Full flow: TDD → test → PR → code review → merge
- `/start-server` — Start local dev servers
- `/verify-issues` — Verify GitHub issues from 6 perspectives
- `/split-issue` — Split GitHub issue into sub-issues
- `/taste-skill`, `/soft-skill`, `/minimalist-skill`, `/brutalist-skill` — Design skills
- Full list: `.claude/skills/*/SKILL.md`

## Key Files

| Purpose | File |
|---------|------|
| Frontend API client | `src/lib/api.ts` |
| Auth context | `src/contexts/AuthContext.tsx` |
| Cart context | `src/contexts/CartContext.tsx` |
| Backend main | `backend/src/main.ts` |
| TypeORM config | `backend/src/database/typeorm.config.ts` |
| Design system | `DESIGN.md` |
