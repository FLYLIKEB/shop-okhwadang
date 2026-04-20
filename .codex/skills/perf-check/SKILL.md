---
name: perf-check
description: Audit frontend performance for bundle size, large dependencies, image usage, and client/server boundaries.
---

# Perf Check

Use this skill when the user asks for a frontend performance review, bundle audit, or optimization pass.

## Check list

1. Build and inspect route/bundle output:

```bash
rm -rf .next
npm run build
```

2. Inspect large installed packages:

```bash
du -sh node_modules/* 2>/dev/null | sort -rh | head -20
```

3. Find oversized public images:

```bash
find public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" \) -size +500k
```

4. Find direct `<img>` usage:

```bash
rg '<img ' src --glob '*.tsx'
```

5. Review unnecessary `'use client'`, missing dynamic imports, and client-side fetching that should stay server-side.

## Reporting

Prioritize findings first:
- Oversized routes or shared bundles
- Heavy dependencies with realistic alternatives
- Image optimization gaps
- Unnecessary client boundaries
- Concrete, lowest-risk fixes
