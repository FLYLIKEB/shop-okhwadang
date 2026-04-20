---
name: split-issue
description: Break a large GitHub issue into smaller, independently executable issues.
---

# Split Issue

Use this skill when a GitHub issue is too broad, mixes unrelated tasks, or needs execution-ready child issues.

## Workflow

1. Read the source issue:

```bash
gh issue view <number> --json title,body,labels
```

2. Separate the issue into coherent slices:
- Independent deliverables
- Sequential dependencies
- Shared prerequisite work

3. For each child issue, draft:
- Clear title
- Scope summary
- Concrete requirements
- Risks or dependencies
- Link back to the original issue

4. If the user wants execution, create the new issues with `gh issue create`, then comment on the original issue with the split map. Only close the original issue when the split fully supersedes it.
