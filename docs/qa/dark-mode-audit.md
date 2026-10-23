# Dark mode coverage audit — 2026-10-24

## Scope and fixes

Source scan covered all frontend route, component and stylesheet trees (124 page/error/loading files and 190 non-test component files). Findings were checked in context rather than replacing every literal color.

| Area | Finding and repair |
| --- | --- |
| Product/cart/checkout/order routes | Removed AppShell's forced light boundaries and their duplicate light token palette. Deleted the obsolete route classifier. |
| Korean/English navigation | Both supported locales restore saved theme preference and expose the theme toggle. |
| Product description and CMS HTML | Dark text/background/border normalization; authored light colors and original image/media pixels retained. Sanitized inline color priorities no longer defeat theme rules. |
| Product/account image fallbacks | Semantic muted surface and dark logo treatment. |
| Notice/event pages, error/degraded states | Semantic surfaces plus readable dark warning states. |
| Account/order/review/admin status feedback | Added missing dark variants, including external Naver review badges. |
| Admin charts | Theme-aware axes, grids, lines/bars, tooltip and cursor. |
| Shared CSS | Dark primary separated from its surface, native color-scheme enabled, input focus and small error-text contrast corrected. |

## Verification

- Full frontend suite: 211 files / 1,273 tests passed. Subsequent focused token/HTML tests passed, including a new >=4.5:1 dark primary/surface contrast assertion.
- Production build, including TypeScript and route generation: passed with the local backend running.
- Whole-repository ESLint and diff whitespace checks: passed.
- Browser: Korean product detail (desktop/mobile), product list, cart, login, notice, event, FAQ and English product detail. Dark root background resolved to rgb(18,18,18); no forced-light route boundaries remained.
- Browser computed-style fixtures verified dark/light imported text, unchanged media background, white photo-caption inheritance, contrasting admin primary button and dark native input color scheme.
- Local service restart performed through `bash scripts/start-local.sh`.

## Deliberate exceptions and limits

Photography, black photo scrims/lightboxes, the black/white announcement bar, payment/login brand artwork and administrator-authored color swatches retain their colors. Third-party payment/address iframe internals are provider-controlled. Raster images containing baked-in text cannot be recolored as HTML.

The source audit covers all frontend trees; browser checks are representative routes, not every authenticated state. No real payment, notification, or customer-data mutation was executed. Admin charts/status states were checked through code/tests and shared CSS fixtures, not production admin login.
