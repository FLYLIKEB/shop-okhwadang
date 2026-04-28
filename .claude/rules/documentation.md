# Documentation Maintenance Rules

Keep CLAUDE.md, `.claude/rules/*.md`, and memory files accurate and up-to-date as the project evolves.

## Automatic Migration Rule

When information appears in `memory/` files (project, feedback, reference) that qualifies as a **persistent project rule**, move it to the appropriate place:
- Coding conventions, patterns, gotchas → `.claude/rules/*.md` (or new file if topic is distinct)
- Project-wide commands, constraints, architecture facts → `CLAUDE.md`
- Then remove the duplicate from memory (memory is for context, not rules)

## Nesting Strategy

Rules are split across CLAUDE.md files per directory scope.
- Root `CLAUDE.md` — project-wide overview, commands, git/PR workflow
- `backend/CLAUDE.md` — NestJS, DB, security, backend testing rules
- `src/CLAUDE.md` — Next.js, React, Tailwind, frontend testing rules
- `.claude/rules/*.md` — shared reference rules (loaded by glob front matter)

## What Belongs Where

| Content type | Destination |
|---|---|
| Project-wide commands, deploy structure | Root `CLAUDE.md` |
| Backend patterns, DB, security | `backend/CLAUDE.md` |
| Frontend patterns, UI, accessibility | `src/CLAUDE.md` |
| Code patterns, architecture decisions | `.claude/rules/architecture.md` |
| Git/PR workflow steps | `.claude/rules/git-workflow.md` |
| Backend-specific patterns (utilities, Swagger, adapters) | `.claude/rules/backend-patterns.md` |
| Frontend-specific patterns (admin, hooks, key files) | `.claude/rules/frontend-patterns.md` |
| Sensitive information handling | `.claude/rules/sensitive-info.md` |
| Key file references | `.claude/rules/key-files.md` |
| Who the user is, work preferences | `memory/user_*.md` |
| Transient project state | `memory/project_*.md` |
| One-time incident notes | Do not save |

## Size Guideline

CLAUDE.md files should stay under ~50 lines. When exceeded, extract topic-specific sections to `.claude/rules/*.md`.
