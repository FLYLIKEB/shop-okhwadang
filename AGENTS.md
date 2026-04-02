# AGENTS.md

This file provides guidance to AI agents working in this repository.

## Project Overview

**옥화당 자사몰** — Korean traditional tea (자사호, 보이차, 다구) D2C shopping mall

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS v4 + Radix UI
- **Backend**: NestJS + TypeORM + MySQL 8.0
- **Runtime**: Node.js 22.x

## Rules & Documentation

**All agents must read and follow the rules in these files:**

| Purpose | File |
|---------|------|
| Project-wide rules, commands, git/PR workflow | `CLAUDE.md` |
| Backend patterns, DB, security, testing | `backend/CLAUDE.md` |
| Frontend patterns, UI, accessibility | `src/CLAUDE.md` |
| Architecture decisions | `.claude/rules/architecture.md` |
| Code style (cross-cutting) | `.claude/rules/code-style.md` |
| Git/PR/Issue workflow | `.claude/rules/git-workflow.md` |
| DB migration rules | `.claude/rules/database.md` |
| Security rules | `.claude/rules/security.md` |
| Deployment rules | `.claude/rules/deployment.md` |
| Design system | `DESIGN.md` |

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
