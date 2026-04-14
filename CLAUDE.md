# CLAUDE.md

## Implementation Principles
1. KISS — simplest implementation for equivalent functionality
2. YAGNI — no code beyond requirements
3. Existing structure first — no unnecessary abstractions
4. Structural integrity — low coupling, high cohesion, unidirectional deps
5. Stop and report — halt on conflicts, mark with TODO

## Working Method
* **Self-Judgment**: Do not ask the user. Make the most reasonable decision and proceed.
* **Reporting**: Complete tasks fully and report only final results.
* **Before Starting**: `git pull origin <current-branch>`
* **Before Pushing**: `git pull --rebase origin <branch>`
* **After Every Task**: restart dev server with `bash scripts/start-local.sh`. No exceptions.

## Project Overview
**옥화당 자사몰** — 자사호·보이차·다구 D2C 쇼핑몰 (Next.js SSR / NestJS + TypeORM + MySQL)
* **Frontend**: Next.js 15 + React 19 + TS + TailwindCSS v4 + Radix UI → Vercel
* **Backend**: NestJS + TypeORM + MySQL → AWS EC2 (DB: AWS Lightsail)
* **Node.js**: 22.x
* **Reference**: Unified with [ChaLog](https://github.com/FLYLIKEB/ChaLog)

## Quick Commands
```bash
bash scripts/start-local.sh          # Full-stack start
bash scripts/stop-local.sh           # Full-stack stop
npm run build && npm run test:run && bash scripts/start-local.sh  # FE build+test+restart
cd backend && npm run build && npm run test      # BE build+test
cd backend && npm run test:e2e       # BE E2E (required for DB schema changes)
cd backend && docker compose up -d   # MySQL
cd backend && docker compose down -v # Reset DB
```

## Issue Tracker
* Phase 0-7 (Setup → MVP → Core → Payment → Admin → CMS → Polish → Ops)
* Labels: `phase-N`, `backend`, `frontend`, `infra`, `P0`~`P3`
* Latest merged PR: #389

## Rules Reference
| Subject | File |
| --- | --- |
| Architecture | `.claude/rules/architecture.md` |
| Code Style | `.claude/rules/code-style.md` |
| Git/PR/Issue Workflow | `.claude/rules/git-workflow.md` |
| DB Migration | `.claude/rules/database.md` |
| Security | `.claude/rules/security.md` |
| Deployment | `.claude/rules/deployment.md` |
| Documentation Maintenance | `.claude/rules/documentation.md` |
| Sensitive Information | `.claude/rules/sensitive-info.md` |
| Key Files | `.claude/rules/key-files.md` |
| Backend Patterns | `.claude/rules/backend-patterns.md` |
| Frontend Patterns | `.claude/rules/frontend-patterns.md` |

Testing rules: `backend/CLAUDE.md` and `src/CLAUDE.md`.
