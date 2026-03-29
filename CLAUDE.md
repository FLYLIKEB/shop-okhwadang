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

**What belongs where:**
| Content type | Destination |
|---|---|
| How to run commands, ports, env vars | `CLAUDE.md` or `.claude/rules/database.md` |
| Code patterns, architecture decisions | `.claude/rules/architecture.md` or `code-style.md` |
| Test patterns, mock conventions | `.claude/rules/testing.md` |
| Git/PR workflow steps | `.claude/rules/git-workflow.md` |
| Who the user is, work preferences | `memory/user_*.md` |
| Transient project state (current branch, next issue) | `memory/project_*.md` |
| One-time incident notes | Do not save |

## Project Overview

**Commerce Demo** — E-commerce Boilerplate for D2C Shopping Mall (Next.js SSR / NestJS + TypeORM + MySQL)

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
* Merged so far: #2–#16 (PRs #46–#60), current branch: `feature/issue-69-70-71-frontend-refactor`

## GitHub CLI

* `gh issue view` fails with classic projects error — use `--json` flag: `gh issue view N --json title,body,labels,state`

## Rules Reference

| Subject | File |
| --- | --- |
| Code Style | `.claude/rules/code-style.md` |
| Testing | `.claude/rules/testing.md` |
| Git/PR/Issue Workflow | `.claude/rules/git-workflow.md` |
| DB Migration | `.claude/rules/database.md` |
| Architecture | `.claude/rules/architecture.md` |

## Critical Rules (from docs)

### Frontend
* Functional components + hooks only. `@/` import alias. `cn()` for Tailwind class merging.
* TypeScript strict — **`any` is forbidden**. shadcn/ui patterns.
* Tailwind arbitrary values (`h-[123px]`) forbidden — use theme tokens.
* **All mutations must show sonner/toast** feedback (success/failure).
* `console.log` in committed code is forbidden.

### Backend
* **Controller → Service → Entity** (DI pattern). **DTO-based** input validation.
* NestJS built-in exceptions only (`NotFoundException`, `BadRequestException`).
* Module structure: `backend/src/modules/{module}/`.
* Global prefix: `/api`. NestJS Logger only (no console.log).

### DB/Migration
* **TypeORM Migration CLI only** — manual SQL files forbidden.
* `synchronize: true` **forbidden in production**.
* Entity changes must **always be committed with Migration file**.
* Migration CLI requires SSH tunnel on port 3307: `LOCAL_DATABASE_URL=mysql://root:__REDACTED_ROOT_PW__@127.0.0.1:3307/commerce npm run migration:run`
* MySQL does NOT support `DROP FOREIGN KEY IF EXISTS` — use INFORMATION_SCHEMA check helper pattern (see `AddOrdersTables` migration for reference).
* Migrations that partially ran on live DB: use `CREATE TABLE IF NOT EXISTS` + existence-check helpers to make `up()` idempotent.

### Security
* Rate limiting: global 10/min, auth 5/min. CORS allowed origins only.
* JWT Guard + ValidationPipe globally applied. bcrypt for passwords.
* PG payments: **server-side amount verification required**.
* `.env`, `*.pem`, `*.key` must be in `.gitignore`.

### Git
* Branch: `feature/issue-{번호}-{설명}` from main only.
* Commit: Korean, `feat: #번호 설명` / `fix: #번호 설명`.
* PR: `Closes #번호` required. Merge: `gh pr merge --merge --delete-branch` (no squash).

### Adapter Pattern
* **PG Payments**: `PaymentGateway` interface → `MockAdapter` / `TossAdapter` / `InicisAdapter`. Selected by `PAYMENT_GATEWAY` env var.
* **Shipping**: `ShippingProvider` interface → `MockAdapter` / `CjAdapter` / `HanjinAdapter`.
* **Storage**: `local` / `s3` / `r2`. Selected by `STORAGE_PROVIDER` env var.

## Key Files

* **API Client**: `src/lib/api.ts`
* **Routes**: `src/App.tsx`
* **Auth Context**: `src/contexts/AuthContext.tsx`
* **Cart Context**: `src/contexts/CartContext.tsx`
* **Environment Variables**: `docs/configuration/ENVIRONMENT_VARIABLES.md`
* **DB Schema**: `docs/infrastructure/DATABASE.md`
* **Docker Setup**: `docs/infrastructure/DOCKER.md`
* **Security Guide**: `docs/security/SECURITY.md`
* **Deployment Guide**: `docs/deployment/DEPLOYMENT.md`
* **Architecture**: `docs/architecture/ARCHITECTURE.md`
* **Backend Design**: `docs/architecture/BACKEND.md` (PG/Shipping adapter patterns)
* **Frontend Design**: `docs/architecture/FRONTEND.md` (template system, CMS)
* **Product Overview**: `docs/product/PRODUCT_OVERVIEW.md`
* **Git Workflow**: `docs/workflow/GIT_WORKFLOW.md`

## Deploy Structure

```
Client → Vercel CDN (Static) + Vercel Functions (api/proxy.ts) → AWS EC2 (NestJS :3000) → Lightsail Docker MySQL :3306
```

