# Button theme and state audit — 2026-10-24

## Scope

Reviewed shared Button variants and their callers, customer route/component native buttons and button-like links, 105 admin TSX files, and scoped CSS overrides. Changes preserve action handlers, routing and payment behavior.

- Dark black/brown actions now use light fills and dark text; white secondary actions use dark fills and light text. Gray and ghost/outline/secondary hover treatments remain visible on dark surfaces.
- Removed ineffective transparent hover overrides and utility-substring overrides that consumed `hover:` class names. Narrowed remaining cart/account/CMS utility selectors to actual classes.
- Restored hover on header, filters, thumbnails, gallery text controls, account actions and native admin pagination/retry/reorder/select controls.
- Corrected destructive confirmation foreground and product visibility/switch selected contrast. Disabled native controls use enabled hover; shared variants keep disabled pointer suppression.
- Keyboard focus indicators use theme-aware ring/offset colors. Photo controls keep their image-safe contrast and editorial text controls may use underline feedback.

## Evidence

- Full frontend suite: 216 files / 1,300 tests passed; ESLint and diff check passed.
- Browser matrix renders the real shared Button component, using application CSS: 11 variants × 6 scopes × 2 themes = 132 combinations. Scopes: base, checkout, admin, account, CMS, header.
- All 132 combinations change visibly on hover. Canvas-composited foreground/background contrast in normal and hover states is at least **5.57:1**. Translucent Tailwind oklab colors are composited through their ancestor backgrounds rather than treated as opaque RGB.
- Browser interaction checks: disabled controls retain their appearance under the pointer and have pointer-events:none; keyboard focus is visible with a ring in representative variants/scopes.
- Actual product page: BUY NOW changes #ededed → #cccccc with #262626 text; ADD TO CART changes #262626 → #444444 with #ededed text in dark mode.
- Regression tests cover paired button token contrast, non-identical hover fills, removal of state-swallowing scope selectors and destructive confirmation text.

## Deliberate exceptions and limits

Payment/login brand colors, photo overlays and product imagery retain their identity. Provider-owned iframe controls are external. The matrix uses real shared components and styles; it does not log into each production admin workflow or submit a purchase. Disabled text contrast is visually reduced intentionally and is not included in the enabled-control contrast threshold.
