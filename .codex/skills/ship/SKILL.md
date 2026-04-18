---
name: ship
description: End-to-end issue delivery workflow for this repository using Codex/OMX conventions.
---

# Ship

Use this skill when the user wants a GitHub issue taken from implementation through verification, PR, and merge workflow.

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
   - `npm run build && npm run test:run`
   - `cd backend && npm run build && npm run test`
   - `cd backend && npm run test:e2e` for schema or migration changes
6. Create a Korean commit message following repo rules.
7. Push branch, open PR, and run a code-review pass before merge.
8. After merge, verify GitHub Actions and remote health checks if the changed area affects deployment/runtime.
9. Restart local services with `bash scripts/start-local.sh` unless the user said not to.

## Guardrails

- Respect `CLAUDE.md`, `backend/CLAUDE.md`, `src/CLAUDE.md`, and `.claude/rules/*.md`.
- Rebase carefully; never use destructive git cleanup unless the user explicitly requests it.
- If CI or deploy fails after merge, do not declare success. Surface the failure and next action.
