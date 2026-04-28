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
bash scripts/start-local.sh          # Full-stack start (FE: http://localhost:5173, BE: http://localhost:3000/api, Dev MySQL: 127.0.0.1:3307)
bash scripts/stop-local.sh           # Full-stack stop
bash scripts/test.sh                 # FE + BE unit tests (Docker 자동 기동)
bash scripts/test.sh frontend        # FE only
bash scripts/test.sh backend         # BE unit only
bash scripts/test.sh e2e             # BE E2E (test MySQL on :3308 자동 기동)
bash scripts/test.sh all             # FE + BE unit + E2E
bash scripts/test-stop.sh            # Stop test MySQL + cleanup workers
npm run test:rtk                     # RTK 필터를 거친 테스트 실행
npm run review:graph                 # Code Review Graph 변경 영향 분석
make bootstrap                       # 워크트리 선행 준비 (deps/venv/env)
make verify                          # 워크트리 선행 준비 + FE/BE 기본 검증
make up                              # 워크트리 선행 준비 + 로컬 서버 시작
cd backend && docker compose up -d   # Dev MySQL (127.0.0.1:3307)
cd backend && docker compose down -v # Reset dev DB
bash scripts/remote-migration.sh     # 원격(프로덕션) DB 마이그레이션
bash scripts/remote-logs.sh          # EC2 백엔드 로그 조회
bash scripts/setup-git-hooks.sh      # post-checkout hook 활성화 (새 워크트리 첫 체크아웃 시 bootstrap 자동 실행)
```

## Worktree Policy
* 기능 브랜치 작업은 반드시 `git worktree add` 로 워크트리를 생성해서 진행
* 워크트리 경로: `../shop-okhwadang-<branch-name>`
* 워크트리 생성 직후 `bash scripts/setup-git-hooks.sh` 1회 실행 후, 첫 체크아웃 자동 bootstrap 또는 `make bootstrap` 수동 실행
* `make bootstrap` - 워크트리 의존성 install + 필수 초기 데이터 준비까지 수행
* 빌드/테스트/서버 실행 전 `make bootstrap` 선행 (`make verify`, `make up` 포함)
* 워크트리에서 `nest: command not found` 또는 홈 렌더 실패 시 `make bootstrap` 누락을 먼저 의심
* 머지 후 `git worktree remove` + `git branch -D` 로 정리

## Issue Tracker
* Phase 0-7 (Setup → MVP → Core → Payment → Admin → CMS → Polish → Ops)
* Labels: `phase-N`, `backend`, `frontend`, `infra`, `P0`~`P3`
* Latest merged PR: #641

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
