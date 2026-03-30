# CLAUDE.md

Rules in English. Self-judge, no questions, report results only.

## Workflow

- Before start: `git pull origin <current-branch>`
- Before push: `git pull --rebase origin <branch>`
- After every task: `bash scripts/start-local.sh`

## Commands

```bash
bash scripts/start-local.sh                          # Full-stack start
bash scripts/stop-local.sh                            # Full-stack stop
npm run build && npm run test:run                     # Frontend build+test
cd backend && npm run build && npm run test           # Backend build+test
cd backend && npm run test:e2e                        # Backend E2E (DB changes)
cd backend && docker compose up -d                    # MySQL+Redis
cd backend && docker compose down -v                  # Reset DB
```

## Stack

| Layer | Tech | Deploy |
|---|---|---|
| Frontend | Next.js 15 + React 19 + TS + TailwindCSS v4 + Radix UI | Vercel |
| Backend | NestJS + TypeORM + MySQL 8.0 | AWS EC2 |
| DB | MySQL 8.0 (Lightsail) | AWS Lightsail |
| Node | 22.x | |

Deploy: `Client → Vercel CDN + Functions (api/proxy.ts) → EC2 (NestJS :3000) → Lightsail MySQL :3306`

## Issues

- 44 issues (#2~#45), Phase 0-7, Labels: `phase-N`, `P0`~`P3`
- Merged: #2–#16 (PRs #46–#60)
- `gh issue view N --json title,body,labels,state` (classic projects workaround)

## Git (detail: `.claude/rules/git-workflow.md`)

- Branch: `feature/issue-{번호}-{설명}` from main
- Commit: Korean, `feat: #번호 설명`
- PR: `Closes #번호`, merge with `gh pr merge --merge --delete-branch`

## Rules Reference

| Subject | File |
|---|---|
| Architecture | `.claude/rules/architecture.md` |
| Code Style | `.claude/rules/code-style.md` |
| Testing | `.claude/rules/testing.md` |
| Git/PR | `.claude/rules/git-workflow.md` |
| DB/Migration | `.claude/rules/database.md` |
| Security | `.claude/rules/security.md` |
| Deployment | `.claude/rules/deployment.md` |

## Doc Maintenance

- Keep CLAUDE.md, `.claude/rules/*.md`, memory files current
- Persistent rules in memory → move to rules/CLAUDE.md, remove from memory
- Scope: root=project-wide, `backend/CLAUDE.md`=backend, `src/CLAUDE.md`=frontend, `.claude/rules/`=shared

## Key Files

- API Client: `src/lib/api.ts`
- Auth/Cart Context: `src/contexts/AuthContext.tsx`, `src/contexts/CartContext.tsx`
- Docs: `docs/project/`, `docs/architecture/`, `docs/infrastructure/`
