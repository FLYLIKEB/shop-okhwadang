---
name: pr-review
description: Review a GitHub PR from security, correctness, performance, and project-rule perspectives.
---

# PR Review

Use this skill when the user asks for a GitHub PR review or wants review comments drafted.

## Inputs

- PR number
- Or full GitHub PR URL
- If omitted, detect the open PR for the current branch

## Workflow

1. Gather metadata and changed files:

```bash
gh pr view <number> --json title,body,state,baseRefName,headRefName,files,additions,deletions
gh pr diff <number>
```

2. Review findings with four lenses:
- Security
- Logic and behavioral regressions
- Performance
- Project rule compliance and maintainability

3. Report findings ordered by severity, with file references where possible.

4. If the user wants GitHub comments posted, prepare:
- Inline comments for concrete high-severity defects
- One summary review comment for the overall verdict

## Verdict

- `APPROVE` only when there are no critical or high-severity findings
- Otherwise `REQUEST_CHANGES`

Keep summaries brief. Findings come first.
