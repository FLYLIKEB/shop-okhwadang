# Git Workflow Rules

## Branch
- Branch from main only: `feature/issue-{번호}-{설명}`
- No direct commits to main/master
- Keep existing branch if already working on it

## Commit
- Korean commit messages
- Format: `feat: #번호 설명` / `fix: #번호 설명` / `refactor:` / `docs:` / `style:` / `test:` / `chore:`
- DB schema changes: entity + migration file must be committed together

## Before Push
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
