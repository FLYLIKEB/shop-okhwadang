---
name: pr-context
description: Pull GitHub PR context into the current task when PR numbers or URLs are mentioned.
---

# PR Context

Use this skill when the user references a PR and you need accurate review context first.

## Fetch

```bash
gh pr view <number> --json title,state,baseRefName,headRefName,additions,deletions,files
gh pr diff <number>
```

## Use

- Summarize branch direction, changed files, and review surface.
- Check for large diff areas, migration risk, and affected subsystems before commenting or editing.
- If prior review comments matter, fetch them and avoid duplicate review points.

This skill replaces the old Claude PR auto-injection hook with explicit Codex behavior.
