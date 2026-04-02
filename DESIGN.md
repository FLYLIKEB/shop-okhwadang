# DESIGN.md

Frontend design guidelines for 옥화당 자사몰. All frontend code must follow this document.

## Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary (Zuni) | `#1B3A4B` | Brand primary — buttons, links, focus rings |
| Tea | `#4A6741` | Accent — secondary actions, highlights |
| Danni | `#C9B8A3` | Muted accent — tags, badges |
| Background | `#FFFFFF` | Page background |
| Foreground | `#1a1a1a` | Body text |
| Card | `#FFFFFF` | Card surfaces |
| Border | `#e8e4de` | Borders, dividers |
| Muted | `#F5F3EF` | Disabled states, subtle backgrounds |
| Destructive | `#b91c1c` | Error states, delete actions |

### Typography

| Class | Font | Size (mobile) | Size (desktop) | Weight | Usage |
|-------|------|---------------|---------------|--------|-------|
| `typo-h1` | Noto Serif KR | 24px | 36px | 600 | Page titles |
| `typo-h2` | Noto Serif KR | 20px | 24px | 600 | Section headings |
| `typo-h3` | Pretendard | 18px | 20px | 500 | Card titles, subsections |
| `typo-body` | Pretendard | 16px | 16px | 400 | Body text |
| `typo-body-sm` | Pretendard | 14px | 14px | 400 | Secondary text |
| `typo-label` | Pretendard | 12px | 12px | — | Labels, captions |
| `typo-button` | Pretendard | 14px | 14px | 500 | Button text |

**Font Families:**
- Display (headings): `Noto Serif KR`, Georgia, serif
- Body: `Pretendard`, Apple SD Gothic Neo, Malgun Gothic, sans-serif
- Mono: `DM Mono`, Courier New, monospace

### Spacing

Use Tailwind spacing scale (`gap-1` through `gap-8`, `p-4`, `m-4`, etc.). For consistent padding:
- Card internal padding: `p-4` (16px)
- Section spacing: `py-6` to `py-8` (24-32px)
- Page margins: `-m-6` on page containers

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 2px | Small inputs, badges |
| `radius-md` | 4px | Buttons, cards |
| `radius-lg` | 8px | Modals, large cards |

### Animations

- **Ken Burns** (`animate-kenburns`): 8s ease-in-out infinite — hero images
- **Fade In Up** (`animate-fade-in-up`): 0.7s ease-out — entrance animations
- **Skeleton Shimmer** (`animate-skeleton-shimmer`): 1.4s ease-in-out — loading states

### Clay Material Tags (니료 태그)

| Class | Background | Text | Usage |
|-------|-----------|------|-------|
| `.tag-zuni` | `#8B4513` | white | 주니(朱泥) |
| `.tag-danni` | `#C4A882` | `#1C1710` | 단니(段泥) |
| `.tag-zini` | `#6B3A5C` | white | 자니(紫泥) |
| `.tag-heukni` | `#2A2520` | `#F8F5F0` | 흑니(黑泥) |
| `.tag-chunsuni` | `#3D6B6B` | white | 청수니(靑水泥) |
| `.tag-nokni` | `#4A6741` | white | 녹니(綠泥) |

## Component Guidelines

### Buttons

- Primary: `bg-primary text-primary-foreground rounded-md radius-md`
- Secondary: `bg-secondary text-secondary-foreground rounded-md radius-md`
- Destructive: `bg-destructive text-destructive-foreground rounded-md radius-md`
- Use `typo-button` class for text styling

### Cards

- Background: `bg-card rounded-lg radius-lg`
- Border: `border border-border`
- Shadow: `shadow-sm` for subtle elevation
- Internal padding: `p-4`

### Forms

- Input: `border border-input rounded-md radius-sm px-3 py-2`
- Focus: `focus:ring-2 focus:ring-ring focus:outline-none`
- Labels: `text-xs font-medium text-muted-foreground`

### Badges

- Use `radius-sm` for small rounded corners
- Muted backgrounds with contrasting text

## Layout Patterns

### Page Structure

```
<body>
  <Header />           # Sticky navigation
  <main>
    <HeroSection />    # Full-width hero
    <ContentSections /> # Bounded width (max-w-5xl centered)
  </main>
  <Footer />
</body>
```

### Responsive Breakpoints

- Mobile first: default styles target mobile
- `md:` — 768px: tablet
- `lg:` — 1024px: desktop

### Admin Layout

- Sidebar: `w-64 shrink-0`
- Content area: `flex-1 overflow-hidden`
- Panel: `w-72 shrink-0`

## Accessibility

- All interactive elements must have `aria-label` or visible text
- Focus states: `focus-visible:ring-2 focus-visible:ring-ring`
- Color contrast: minimum 4.5:1 for body text (WCAG AA)
- Touch targets: minimum 44x44px on mobile
- **Use explicit color values** — do not use `opacity` to hint text hierarchy; use muted foreground tokens instead

## Line Height

| Context | Value | Usage |
|---------|-------|-------|
| Headings | 1.2–1.3 | Titles, section headers |
| Body | 1.5–1.6 | Paragraphs, descriptions |
| Compact | 1.1 | Labels, badges, captions |

## Page-Specific Typography

### Product Detail
- Page title: `typo-h1` (24px mobile / 36px desktop)
- Price: `typo-h2` + `font-semibold`
- Option labels: `typo-label` (12px)
- Description: `typo-body` (16px)
- Breadcrumb: `typo-label` (12px)

### Checkout
- Page title: `typo-h1`
- Section titles (배송지, 결제수단): `typo-h3`
- Form labels: `typo-label` (12px) + `font-medium`
- Input values / body: `typo-body-sm` (14px)
- Error messages: `typo-label` (12px) + `text-destructive`
- Order summary price: `typo-h3` + `font-semibold`

### Journal / FAQ / Notice
- Page titles: `typo-h1`
- Section titles: `typo-h3`
- Body text: `typo-body` + `leading-relaxed` (line-height 1.6)
- Category labels: `typo-label` (12px)

### Hero Banner
- Text hierarchy: use `typo-h1` → `typo-body` → `typo-label` (no raw `text-*` overrides)
- Contrast: ensure 4.5:1 ratio against background
- Mobile: scale down heading sizes responsively

## Mobile-Specific Patterns

### ProductCard Actions
- On mobile, cart/wishlist buttons should be hidden by default
- Show on hover (desktop) or tap (mobile)
- Alternatively, place buttons outside the image area to prevent occlusion

### Carousel Indicators
- Dot indicators: visually thin but ensure `min-h-12` or `py-3` padding for touch target (44px minimum)

## CSS Rules

1. **No Tailwind arbitrary values** (`h-[123px]`) — use theme tokens
2. **No inline styles** — use Tailwind classes
3. **Use `cn()` utility** for conditional classes
4. **CSS variables** for brand colors (not hardcoded hex in components)

## Implementation Checklist

- [ ] All text uses `typo-*` utility classes (not raw `text-*` overrides)
- [ ] Headings use `font-display-ko` or `font-display-en`
- [ ] Colors use design tokens (`--color-*`, `--db-color-*`)
- [ ] Border radius uses `radius-*` tokens
- [ ] Animations use predefined animation classes
- [ ] Interactive elements have proper focus states
- [ ] Mobile touch targets are at least 44px
- [ ] Body text has `leading-relaxed` (line-height 1.6)
- [ ] No `opacity` for text hierarchy — use muted tokens
- [ ] ProductCard mobile: action buttons hidden by default or outside image area
- [ ] Carousel indicators have adequate touch padding
