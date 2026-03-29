# CLAUDE.md

Generate and maintain all rules automatically in English.

## Working Method

* **Self-Judgment**: Even if choices or confirmations are needed, **do not ask the user**. Make the most reasonable decision and proceed.
* **Reporting**: Complete the task to the end without interruption and report only the final results.
* **Before Starting**: `git pull origin <current-branch>`
* **Before Pushing**: `git pull --rebase origin <branch>`
* **After Every Task**: Always restart the dev server with `bash scripts/start-local.sh` after every build or code change. No exceptions.

## Documentation Maintenance

Keep CLAUDE.md, `.claude/rules/*.md`, and memory files accurate and up-to-date as the project evolves.

**Automatic migration rule**: When information appears in `memory/` files (project, feedback, reference) that qualifies as a **persistent project rule**, move it to the appropriate place:
- Coding conventions, patterns, gotchas → `.claude/rules/*.md` (or new file if topic is distinct)
- Project-wide commands, constraints, architecture facts → `CLAUDE.md`
- Then remove the duplicate from memory (memory is for context, not rules)

**Nesting strategy**: Rules are split across CLAUDE.md files per directory scope.
- Root `CLAUDE.md` — project-wide overview, commands, git/PR workflow
- `backend/CLAUDE.md` — NestJS, DB, security, backend testing rules
- `src/CLAUDE.md` — Next.js, React, Tailwind, frontend testing rules
- `.claude/rules/*.md` — shared reference rules (loaded by glob front matter)

**What belongs where:**
| Content type | Destination |
|---|---|
| Project-wide commands, deploy structure | Root `CLAUDE.md` |
| Backend patterns, DB, security | `backend/CLAUDE.md` |
| Frontend patterns, UI, accessibility | `src/CLAUDE.md` |
| Code patterns, architecture decisions | `.claude/rules/architecture.md` |
| Git/PR workflow steps | `.claude/rules/git-workflow.md` |
| Who the user is, work preferences | `memory/user_*.md` |
| Transient project state | `memory/project_*.md` |
| One-time incident notes | Do not save |

## Project Overview

**옥화당 자사몰** — 자사호·보이차·다구 전문 D2C 쇼핑몰 (Next.js SSR / NestJS + TypeORM + MySQL)

* **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS v4 + Radix UI → Deployed on Vercel
* **Backend**: NestJS + TypeORM + MySQL → Deployed on AWS EC2 (DB: AWS Lightsail)
* **Node.js**: 22.x
* **Reference**: Unified with [ChaLog](https://github.com/FLYLIKEB/ChaLog) — same tech stack, code style, git workflow, deploy structure

## Quick Commands

```bash
bash scripts/start-local.sh          # Full-stack start (SSH Tunnel + Backend :3000 + Frontend :5173)
bash scripts/stop-local.sh           # Full-stack stop
npm run build && npm run test:run && bash scripts/start-local.sh  # Frontend build + test + restart server
cd backend && npm run build && npm run test      # Backend build + test
cd backend && npm run test:e2e       # Backend E2E (Required for DB schema changes)
cd backend && docker compose up -d   # Start MySQL + Redis
cd backend && docker compose down -v # Reset DB (volume cleanup)
```

## Issue Tracker

* 44 issues (#2~#45) organized in Phase 0-7
* Phase 0: Setup → 1: MVP → 2: Core → 3: Payment → 4: Admin → 5: CMS → 6: Polish → 7: Ops
* Labels: `phase-N`, `backend`, `frontend`, `infra`, `P0`~`P3`
* Merged so far: #2–#16 (PRs #46–#60)

## GitHub CLI

* `gh issue view` fails with classic projects error — use `--json` flag: `gh issue view N --json title,body,labels,state`

## Git Rules (summary — full detail in `.claude/rules/git-workflow.md`)

* Branch: `feature/issue-{번호}-{설명}` from main only
* Commit: Korean, `feat: #번호 설명` / `fix: #번호 설명`
* PR: `Closes #번호` required. Merge: `gh pr merge --merge --delete-branch` (no squash)

## Deploy Structure

```
Client → Vercel CDN (Static) + Vercel Functions (api/proxy.ts) → AWS EC2 t3.small (NestJS :3000) → AWS Lightsail MySQL :3306
```

## Rules Reference

| Subject | File |
| --- | --- |
| Architecture | `.claude/rules/architecture.md` |
| Code Style | `.claude/rules/code-style.md` |
| Testing | `.claude/rules/testing.md` |
| Git/PR/Issue Workflow | `.claude/rules/git-workflow.md` |
| DB Migration | `.claude/rules/database.md` |
| Security | `.claude/rules/security.md` |
| Deployment | `.claude/rules/deployment.md` |

## Key Files

* **API Client**: `src/lib/api.ts`
* **Auth Context**: `src/contexts/AuthContext.tsx`
* **Cart Context**: `src/contexts/CartContext.tsx`
* **Product Overview**: `docs/project/PRODUCT_OVERVIEW.md`
* **Roadmap**: `docs/project/ROADMAP.md`
* **Architecture**: `docs/architecture/ARCHITECTURE.md`
* **Backend Design**: `docs/architecture/BACKEND.md`
* **Frontend Design**: `docs/architecture/FRONTEND.md`
* **Deployment Guide**: `docs/infrastructure/DEPLOYMENT.md`
* **DB Schema**: `docs/infrastructure/DATABASE.md`
* **Environment Variables**: `docs/infrastructure/ENVIRONMENT_VARIABLES.md`
