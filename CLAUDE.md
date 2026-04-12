# CLAUDE.md

# Implementation Principles

1. KISS — choose the simplest implementation for equivalent functionality
2. YAGNI — do not write code beyond requirements
3. Existing structure first — no unnecessary abstractions or file creation
4. Structural integrity — low coupling, high cohesion, unidirectional dependencies; no shortcuts
5. Stop and report — halt implementation on conflicts, mark with TODO

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

* Issues organized in Phase 0-7
* Phase 0: Setup → 1: MVP → 2: Core → 3: Payment → 4: Admin → 5: CMS → 6: Polish → 7: Ops
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

Testing rules are in `backend/CLAUDE.md` and `src/CLAUDE.md`.

## Sensitive Information

**민감 정보가 포함된 문서는 절대 git에 commit하지 않습니다.**

| 구분 | 예시 | 처리 |
|------|------|------|
| AWS 리소스 ID/IP | Instance ID, Public IP, VPC ID, Account ID | `{{PLACEHOLDER}}`로 교체 후 `.env.secrets` 참조 가이드 추가 |
| SSH/RDP 접속 정보 | Key Pair 이름, Bastion Host | `.env.secrets`에만 저장 |
| API Key/시크릿 | AWS Access Key,Secret, PG API Key | GitHub Secrets 또는 `.env.secrets` 관리 |
| DB 접속 정보 | 호스트, 포트, DB 이름 | `.env.secrets`에만 저장 |

**인프라 문서 작성 시:**
1. 리소스 ID, IP, ARN 등은 `{{EC2_INSTANCE_ID}}`等形式으로 placeholder 사용
2. 문서 상단에 리소스 값 참조 방법을 AWS CLI 명령어로 명시
3. 실제 값은 `.env.secrets` (또는 GitHub Secrets)에만 보관
4. Commit 전 `git diff`로 민감 정보 포함 여부 확인

**관련 파일:**
- `docs/infrastructure/s3-cloudfront-cdn.md` — 모든 민감값 placeholder 처리됨
- `.gitignore`에 `docs/infrastructure/s3-cloudfront-cdn.md` 추가됨 (로컬 임시 파일)

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
* **S3+CloudFront CDN**: `docs/infrastructure/s3-cloudfront-cdn.md` (민감값 placeholder 처리)
