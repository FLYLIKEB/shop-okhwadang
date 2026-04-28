---
name: update-rules
description: Review project guidance files and update them when the codebase has materially changed.
---

# Update Rules

Use this skill after substantial work when the repository guidance may have drifted from reality.

## Review targets

- `AGENTS.md`
- `CLAUDE.md`
- `backend/CLAUDE.md`
- `src/CLAUDE.md`
- `.claude/rules/*.md`
- `DESIGN.md` when frontend conventions changed

## Policy

- Update documentation only when the current session established a real new rule, pattern, or constraint.
- Keep edits minimal and factual.
- Do not create speculative future rules.
- Do not rewrite files for style-only changes.

This skill replaces the old Claude stop-hook maintenance flow with an explicit review step.
