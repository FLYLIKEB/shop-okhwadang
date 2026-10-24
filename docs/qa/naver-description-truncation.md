# Naver product description truncation — 2026-10-24

## Confirmed cause

A read-only comparison of 32 live Naver products with their stored descriptions found eight exact truncated prefixes. Each stored value was 65,535 bytes; the corresponding source HTML exceeded that limit (up to 99,461 bytes before the importer's existing whitespace trim).

`originProduct.detailContent` reaches the importer without a substring/length cap. MySQL `products.description` was `TEXT`; production `@@sql_mode` was `IGNORE_SPACE,NO_ENGINE_SUBSTITUTION`. This permits oversized TEXT values to be stored with a warning and their tail removed rather than failing the import. The resulting HTML was sometimes cut inside an image tag or attribute.

The official [origin product schema](https://apicenter.commerce.naver.com/docs/commerce-api/current/schemas/%EC%9B%90%EC%83%81%ED%92%88-%EC%A0%95%EB%B3%B4-%EA%B5%AC%EC%A1%B0%EC%B2%B4) defines the main `detailContent` string separately from the limited product-notice detail fields. No API-side body truncation was observed in this comparison.

| Product ID | Stored bytes before fix | Complete mapped HTML bytes |
| --- | ---: | ---: |
| 34 | 65,535 | 99,460 |
| 35 | 65,535 | 77,244 |
| 36 | 65,535 | 87,601 |
| 37 | 65,535 | 66,160 |
| 49 | 65,535 | 67,436 |
| 51 | 65,535 | 68,988 |
| 62 | 65,535 | 71,114 |
| 63 | 65,535 | 69,297 |

## Fix and verification

- Expand all four product description columns to LONGTEXT; preserve nullable values and the existing import mapping.
- Refuse rollback if any description exceeds the TEXT byte limit. Enforce strict SQL mode for the narrowing ALTER and restore its original session mode even on failure.
- Test >65KB Korean/emoji HTML, end sentinel and final image through preview, create, query and re-import update. Preview must not write.
- Full backend E2E: 365 tests passed on the dedicated local `naver_description_test` database. Migration safety tests and importer unit tests pass.

## Controlled recovery

After schema deployment, restore only the eight confirmed products. Fetch fresh Naver data, require a unique matching SKU and an exact 65,535-byte stored prefix, and refuse missing/malformed/changed sources. Back up the original rows in a private file before writing. Lock all affected rows, check for concurrent description edits, update only `description`, verify exact round-trip equality and preservation of every other field (apart from the normal update timestamp), then commit atomically.

Do not perform a general product re-import: that would also synchronize prices, stock and options. Other non-identical descriptions that are not proven truncated prefixes are outside recovery scope. Clear the running backend's 600-second product cache after repair and allow the storefront's 60-second product cache to refresh; verify the public API and rendered final images independently.
