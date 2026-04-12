# AGENTS.md

This file provides guidance to AI agents working in this repository.

## Rules & Documentation

**Global Claude Code settings** (`~/.claude/CLAUDE.md`) apply first. Project rules below supplement and may override global settings for project-specific needs.

| Priority | Purpose | File |
|----------|---------|------|
| 1 (global) | Claude Code global configuration | `~/.claude/CLAUDE.md` |
| 2 | Project-wide rules, commands, git/PR workflow | `CLAUDE.md` |
| 3 | Backend patterns, DB, security, testing | `backend/CLAUDE.md` |
| 4 | Frontend patterns, UI, accessibility | `src/CLAUDE.md` |
| 5 | Architecture decisions | `.claude/rules/architecture.md` |
| 6 | Code style (cross-cutting) | `.claude/rules/code-style.md` |
| 7 | Git/PR/Issue workflow | `.claude/rules/git-workflow.md` |
| 8 | DB migration rules | `.claude/rules/database.md` |
| 9 | Security rules | `.claude/rules/security.md` |
| 10 | Deployment rules | `.claude/rules/deployment.md` |
| - | Design system | `DESIGN.md` |

**Available skills** (invoke via `/skill` or keyword triggers):
- `/ship` — Full flow: TDD → test → PR → code review → merge
- `/start-server` — Start local dev servers
- `/verify-issues` — Verify GitHub issues from 6 perspectives
- `/split-issue` — Split GitHub issue into sub-issues
- `/taste-skill`, `/soft-skill`, `/minimalist-skill`, `/brutalist-skill` — Design skills
- Full list: `.claude/skills/*/SKILL.md`

## Key Files

| Purpose | File |
|---------|------|
| Frontend API client | `src/lib/api.ts` |
| Auth context | `src/contexts/AuthContext.tsx` |
| Cart context | `src/contexts/CartContext.tsx` |
| Backend main | `backend/src/main.ts` |
| TypeORM config | `backend/src/database/typeorm.config.ts` |
| Design system | `DESIGN.md` |

## Claude Hooks Best Practices

Hooks in `~/.claude/hooks/` that spawn subagents (via `claude --dangerously-skip-permissions`) **must** prevent recursive execution:

```bash
#!/bin/bash
PROJECT_DIR=$(pwd)

# 1. Check if already in a subagent - prevent recursion
if [ -n "$CLAUDE_HOOKS_DISABLED" ]; then
  exit 0
fi

# 2. Run only in git repos
if ! git -C "$PROJECT_DIR" rev-parse --git-dir > /dev/null 2>&1; then
  exit 0
fi

# 3. Launch subagent with CLAUDE_HOOKS_DISABLED set
CLAUDE_HOOKS_DISABLED=1 claude --dangerously-skip-permissions -p "..." 2>/dev/null &
exit 0
```

**Why**: When a hook spawns a subagent and the subagent session ends, the Stop hook fires again → infinite loop.

**Kill switches** (OMC):
- `DISABLE_OMC=1` — disable entire OMC
- `OMC_SKIP_HOOKS=hook-name` — skip specific hook only
