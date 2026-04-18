---
name: issue-context
description: Pull GitHub issue context into the current task when issue numbers are mentioned.
---

# Issue Context

Use this skill when the user references one or more GitHub issues and you need the current issue details before proceeding.

## Fetch

```bash
gh issue view <number> --json title,body,labels,state,comments
```

## Use

- Summarize the current issue intent, constraints, and recent comment changes.
- Treat newer comments as potentially higher-priority clarifications than the body.
- If multiple issues are mentioned, identify overlaps or conflicts before implementation.

This skill replaces the old Claude auto-injection hook with explicit Codex behavior.
