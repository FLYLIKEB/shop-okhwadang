# DESIGN.md

Frontend design guidelines for shop-okhwadang. All frontend code must follow this document.

## Core Principles

1. **Reuse abstractions** — Do not reimplement `src/styles/globals.css`, `src/components/ui/`, `src/hooks/`
2. **No Tailwind arbitrary values** — Use theme tokens instead of `h-[123px]`
3. **Use `cn()`** — Use `cn()` utility for conditional Tailwind classes
4. **Use CSS variables** — Use `--color-*` tokens instead of hardcoded hex values

## Color Palette

All colors are CSS variables in `src/styles/globals.css`. Use tokens, not raw hex.

| Token | Default Hex | Usage |
|-------|-------------|-------|
| `--color-primary` | `#1B3A4B` | Brand primary — buttons, links, focus rings |
| `--color-tea` | `#4A6741` | Accent — secondary actions, highlights |
| `--color-danni` | `#C9B8A3` | Muted accent — tags, badges |
| `--color-surface` | `#F5F3EF` | Subtle backgrounds |
| `--color-background` | `#FFFFFF` | Page background |
| `--color-foreground` | `#1a1a1a` | Body text |
| `--color-card` | `#FFFFFF` | Card surfaces |
| `--color-border` | `#e8e4de` | Borders, dividers |
| `--color-muted` | `#F5F3EF` | Disabled states, subtle backgrounds |
| `--color-destructive` | `#b91c1c` | Error states, delete actions |

## Typography

### Scale (defined in `src/styles/globals.css`)

| Class | Font | Mobile | Desktop | Weight |
|-------|------|--------|---------|--------|
| `typo-h1` | Noto Serif KR | 24px | 36px | 600 |
| `typo-h2` | Noto Serif KR | 20px | 24px | 600 |
| `typo-h3` | Pretendard | 18px | 20px | 500 |
| `typo-body` | Pretendard | 16px | 16px | 400 |
| `typo-body-sm` | Pretendard | 14px | 14px | 400 |
| `typo-label` | Pretendard | 10px | 10px | — |
| `typo-button` | Pretendard | 14px | 14px | 500 |

### Typography Rules

** MUST use `typo-*` utilities instead of raw `text-*` Tailwind classes.**

| Raw Tailwind | Utility Class |
|--------------|---------------|
| `text-xs` | `typo-label` |
| `text-sm` | `typo-body-sm` |
| `text-base` | `typo-body` |
| `text-lg` | `typo-h3` |
| `text-xl` | `typo-h2` |
| `text-2xl` | `typo-h1` |

**Exception**: Only use `text-*` when the exact size doesn't match any `typo-*` utility, or when you need to override a `typo-*` for a specific reason (with a comment explaining why).

### Font Families (최대 3종)
- Display: `--font-display` = Noto Serif KR, Georgia, serif (제목/헤드라인)
- Body: `--font-body` = Pretendard, Apple SD Gothic Neo, sans-serif (본문)
- Mono: `--font-mono` = DM Mono, Courier New, monospace (코드/숫자)

### Line Height
| Context | Value |
|---------|-------|
| Headings | 1.25 |
| Body | 1.6 |
| Compact | 1.1 |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 2px | Small inputs, badges |
| `--radius-md` | 4px | Buttons, cards |
| `--radius-lg` | 8px | Modals, large cards |

## Animation Utilities

| Class | Description |
|-------|-------------|
| `animate-kenburns` | Hero images (8s infinite) |
| `animate-fade-in-up` | Entrance animations (0.7s) |
| `animate-skeleton-shimmer` | Loading skeleton (1.4s) |

## Clay Material Tags

`.tag-*` classes in `src/styles/globals.css`. Use instead of raw color values.

| Class | Background | Text |
|-------|-----------|------|
| `.tag-zuni` | `#8B4513` | white |
| `.tag-danni` | `#C4A882` | `#1C1710` |
| `.tag-zini` | `#6B3A5C` | white |
| `.tag-heukni` | `#2A2520` | `#F8F5F0` |
| `.tag-chunsuni` | `#3D6B6B` | white |
| `.tag-nokni` | `#4A6741` | white |

## Common Components

### UI Components (`src/components/ui/`)
| Component | Usage | Key API |
|-----------|-------|---------|
| `Button` | CVA variants: default, destructive, outline, secondary, ghost, link | `variant`, `size`, `asChild` |
| `Skeleton` | Single skeleton placeholder | `className` |
| `SkeletonList` | List skeleton wrapper | `count`, `className` |
| `Modal` | Radix UI modal | `open`, `onOpenChange`, `children` |
| `FormInput` | Form input | `label`, `error`, `...InputHTMLAttributes` |
| `FormSelect` | Form select | `label`, `error`, `options`, `...SelectHTMLAttributes` |

### Admin Components (`src/components/admin/`)
| Component | Usage |
|-----------|-------|
| `AdminTable` | Table shell with headers, empty state, row actions |
| `StatusBadge` | Active/inactive badge (활성/비활성) |
| `ProductImageUploader` | Image upload with preview |
| `OrderStatusSelect` | Order status dropdown |

## Hooks (`src/hooks/`)

| Hook | Usage |
|------|-------|
| `useAdminGuard` | Admin role check + redirect. Returns `{ user, isLoading, isAdmin }` |
| `useFormModal<T>` | Form modal state. Returns `{ formData, setFormData, loading, handleSubmit }` |
| `useAsyncAction` | Async loading/error state. Returns `{ loading, error, execute }` |
| `useScrollLogoTransition` | Hero → header logo crossfade. Returns `{ heroLogoStyle, headerLogoStyle, progress, isHeroVisible }` |
| `useWishlistToggle` | Wishlist toggle with optimistic update |

## Utilities (`src/utils/`)

| Function | Usage |
|---------|-------|
| `cn()` | Tailwind class merge (clsx + twMerge) |
| `formatCurrency(amount)` | Format price with Korean won (e.g., `₩100,000`) |
| `handleApiError(err)` | Extract error message string |

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | 0–767px | Mobile first |
| `md:` | 768px+ | Tablet |
| `lg:` | 1024px+ | Desktop |

## Layout Patterns

```
<body>
  <Header />           # Sticky navigation
  <main>
    <HeroSection />    # Full-width hero
    <ContentSections /> # max-w-5xl centered
  </main>
  <Footer />
</body>
```

### Admin Layout
- Sidebar: `w-64 shrink-0`
- Content: `flex-1 overflow-hidden`
- Panel: `w-72 shrink-0`

## Accessibility

- All interactive elements: `aria-label` or visible text
- Focus: `focus-visible:ring-2 focus-visible:ring-ring`
- Color contrast: minimum 4.5:1 (WCAG AA)
- Touch target: minimum 44x44px

## Implementation Checklist

- [ ] All text uses `typo-*` utilities (no raw `text-*` overrides, except for valid exceptions)
- [ ] Headings use `font-display` (Noto Serif KR)
- [ ] Font families: max 3种 (display, body, mono)
- [ ] Colors use `--color-*` tokens (no hardcoded hex)
- [ ] Border radius uses `radius-*` tokens
- [ ] Animations use `animate-*` utilities
- [ ] Interactive elements have focus states
- [ ] Mobile touch targets are 44px+
- [ ] ProductCard: cart/wishlist buttons hidden on mobile
- [ ] Async operations use `useAsyncAction` (loading + error states required)
- [ ] Error messages display via `handleApiError()` with user feedback
- [ ] No Tailwind arbitrary values (`h-[123px]`)

---

**Rule: Do not reimplement existing abstractions. Update this document first if a new global component is needed.**
