---
description: Git branch, commit, PR workflow rules — always active
alwaysApply: true
---
# Git Workflow Rules

## Branch
- Branch from main only: `feature/issue-{번호}-{설명}`
- No direct commits to main/master
- Keep existing branch if already working on it
- Worktree first: `git worktree add`로 분리 작업 후 `make bootstrap` 실행
- 새 워크트리 자동 bootstrap을 위해 최초 1회 `bash scripts/setup-git-hooks.sh` 실행

## Commit
- Korean commit messages
- Format: `feat: #번호 설명` / `fix: #번호 설명` / `refactor:` / `docs:` / `style:` / `test:` / `chore:`
- DB schema changes: entity + migration file must be committed together

## Before Push
- 워크트리 사전 준비: `make bootstrap` (또는 `make verify`)
- `git pull --rebase origin {branch}`
- Frontend: `npm run build && npm run test:run`
- Backend: `cd backend && npm run build && npm run test`
- DB schema changes: `cd backend && npm run test:e2e`

## PR
- Title with issue number
- Body must include `Closes #번호`
- Merge: `gh pr merge --merge --delete-branch` (merge commit, no squash)

## GitHub CLI
- `gh issue view` fails with classic projects — use `--json` flag:
  `gh issue view N --json title,body,labels,state`
