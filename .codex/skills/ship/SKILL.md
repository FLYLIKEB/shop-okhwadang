---
name: project-ship
description: Project-specific end-to-end issue delivery workflow for okhwadang using Codex/OMX conventions. Use `$project-ship` when this repository's GitHub issue workflow should override the user-level `$ship` skill.
---

# Project Ship

Use `$project-ship` when the user wants an okhwadang GitHub issue taken from implementation through verification, PR, and merge workflow.

This project-local skill intentionally avoids the generic `ship` name because a user-level `$ship` skill also exists. Keep the names distinct so skill routing is deterministic.

## Scope

- Prefer one issue at a time unless the user explicitly asks for a batch.
- For multiple issues, group independent work into waves and keep merge steps sequential.
- Never commit directly to `main`.

## Workflow

1. Read the issue, including comments:

```bash
gh issue view <number> --json title,body,labels,state,comments
```

2. Create an isolated branch or worktree from `origin/main`.
3. Use `ralplan` first if requirements, tests, or architectural impact need clarification.
4. Implement with TDD where practical.
5. Verify:
   - `make bootstrap` before implementation in a new worktree; use `make up` for local runtime verification.
   - `bash scripts/codex-project-guard.sh` before final reporting to catch merge markers, invalid locale JSON, shell syntax errors in local runtime scripts, and missing JWT key files.
   - `npm run build && npm run test:run`
   - `cd backend && npm run build && npm run test`
   - `cd backend && npm run test:e2e` for schema or migration changes
   - For runtime/UI/CMS/i18n changes, do not trust script success alone: verify `curl http://localhost:3000/api/health`, `curl -I http://localhost:5173/ko`, listening ports `3000`/`5173`, and affected locale URLs such as `/en/p/<slug>`.
6. Create a Korean commit message following repo rules.
7. Push branch, open PR, and run a code-review pass before merge.
8. After merge, verify GitHub Actions and remote health checks if the changed area affects deployment/runtime.
9. Pull/update `main` locally and return to the main checkout.
10. If an isolated git worktree was created for the issue, always remove that local worktree folder after the PR has merged into `main`:
   - Use `git worktree remove --force <worktree-path>` when the path is still registered.
   - Then verify the worktree folder no longer exists; if it remains, remove that exact folder path directly.
   - Do not leave the worktree in Finder Trash. Prefer direct deletion over moving to Trash; if an exact matching worktree folder was moved to `~/.Trash`, remove that exact trashed folder too. Never empty the whole Trash.
11. Restart local services with `bash scripts/start-local.sh` unless the user said not to.

## Guardrails

- Respect `CLAUDE.md`, `backend/CLAUDE.md`, `src/CLAUDE.md`, and `.claude/rules/*.md`.
- Rebase carefully; never use destructive git cleanup unless the user explicitly requests it.
- If CI or deploy fails after merge, do not declare success. Surface the failure and next action.
