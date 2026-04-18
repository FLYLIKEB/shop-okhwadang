---
name: verify-issues
description: Audit one or more GitHub issues against repository rules, code realities, missing tests, and implementation risks.
---

# Verify Issues

Use this skill when the user asks to validate issue quality before implementation.

## Audit dimensions

1. Rule and architecture conflicts
2. Missing test requirements
3. Security, performance, and code-quality risks
4. Missing edge cases or linked follow-up work
5. Existing code and utility reuse opportunities
6. Clarity and cross-issue conflicts

## Workflow

1. Fetch target issues, or all open issues when no argument is given:

```bash
gh issue list --state open --json number,title,body,labels --limit 100
```

2. Read project rules and key files before judging the issue.
3. Cross-check the issue against the actual codebase rather than relying only on the issue text.
4. Produce a structured verdict:
- Passed
- Needs clarification
- Needs rewrite

5. If the user wants mutation, append a verification section to the issue body or add a comment with the audit summary. Never delete the original issue text.
