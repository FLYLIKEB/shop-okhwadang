---
name: taste-skill
description: High-agency frontend design guidance that pushes against generic LLM UI defaults.
---

# Taste Skill

Use this skill when the user wants premium frontend design rather than safe default UI.

## Defaults

- Prefer expressive but disciplined typography. Avoid `Inter`.
- Keep one accent color at most.
- Avoid centered-hero-by-default layouts. Favor asymmetric structure.
- Add meaningful loading, empty, and error states.
- Use motion sparingly and only on `transform` and `opacity`.
- Never use emojis or AI-cliche marketing copy.

## Project-specific fit

- Respect existing patterns when editing an established area.
- Frontend work still follows `DESIGN.md`, `src/CLAUDE.md`, and project Tailwind conventions.
- Default to server components in Next.js unless interaction requires a client boundary.

## Anti-slop guardrails

- No generic three-column card grids unless the existing design system already uses them.
- No neon purple/blue defaults.
- No oversized hero text without a composition reason.
- Use real layout intent: split sections, staggered rhythm, contrast in scale.
