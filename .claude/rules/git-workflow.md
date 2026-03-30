---
description: Git workflow rules
alwaysApply: true
---
# Git Workflow

- Branch: `feature/issue-{번호}-{설명}` from main only, no direct main commits
- Commit: Korean, `feat: #번호 설명` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`
- DB changes: entity + migration committed together
- Before push: `git pull --rebase origin {branch}`, run build+test
- PR: title with issue#, body has `Closes #번호`, merge: `gh pr merge --merge --delete-branch`
- GH CLI: `gh issue view N --json title,body,labels,state`
