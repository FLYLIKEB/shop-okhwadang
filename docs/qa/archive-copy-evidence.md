# Archive copy evidence — 2026-10-24

The rewrite is grounded in Ockhwadang's public product titles, descriptions and matching attribute filters, not the old illustrative archive/collection seed prose. The inspected Korean catalogue contained 17 public products; payment-test product #26 was excluded.

## Sources and limits

| Subject | Public product records | Facts used |
| --- | --- | --- |
| Old Zini | [/products/62](https://ockhwadang.com/ko/products/62), [/58](https://ockhwadang.com/ko/products/58), [/57](https://ockhwadang.com/ko/products/57), [/47](https://ockhwadang.com/ko/products/47) | Stated clay/origin, approximate capacities, full/semi-handmade designations; #57/58 record 40-/100-mesh processing of the same ore. |
| Hongwei Zhuni | [/59](https://ockhwadang.com/ko/products/59), [/41](https://ockhwadang.com/ko/products/41) | Yixing raw-ore designation; Duozhi 110cc, Shuiping 90/120cc. |
| Benshan Luni | [/55](https://ockhwadang.com/ko/products/55), [/54](https://ockhwadang.com/ko/products/54) | Panhu 100cc and Qiushui 120cc, both described as fully handmade. |
| Duanni / Old Duanni | [/52](https://ockhwadang.com/ko/products/52), [/48](https://ockhwadang.com/ko/products/48), [/39](https://ockhwadang.com/ko/products/39) | Specific clay designations; #52 semi-handmade 80cc; #39 semi-handmade Lianzi 110cc, seven spout holes. |
| Old Qingshuini / Wuni | [/36](https://ockhwadang.com/ko/products/36), [/34](https://ockhwadang.com/ko/products/34) | Hanwa 70cc, fully handmade, seven spout holes; attributed reproduction accounts and comparison photos. |
| Qinghuini | [/25](https://ockhwadang.com/ko/products/25) | Tieqiu 120cc, seven spout holes; the individual material is described as Heidundou. |
| Firing record | [/63](https://ockhwadang.com/ko/products/63) | Only the individual gas-kiln colour/sheen anecdote from its account; no universal firing temperature, performance or authenticity claim. |

The old archive's pot forms presented as people, invented career details, unsupported tea pairings/health/thermal effects, mixed-language process paragraphs and incorrect category links were removed. These are product-record attributions, not independent mineralogical testing or authentication.

Known catalogue inconsistencies were not propagated: #63's form attribute says Xishi while its title/body say Qinquan; #56's title/body disagree on clay; #48 has a conflicting Chinese form label. #39's making code is `machine` but its displayed label and prose say semi-handmade, so copy uses the latter. Product records themselves are outside this archive-only update.

## Navigation and content

All twelve Korean material/form filters returned HTTP 200 and at least one matching public product at verification. Use `old_zini`, `hongwei_zhuni`, `benshan_luni`, `danji`, `old_duanni`, `old_qingshuini`, `wuni`, `qinghuini` and form keys `supeong`, `fanggu`, `lianzi`, `hanwa`. English catalogue visibility remains independent; absent English product photos use the existing text-only layout.

The immutable `archive-copy-1789100000000.json` supplies both the migration and fresh archive seeds. The migration preserves block IDs, positions and visibility, backs up original and replacement JSON/types, only updates the archive slots, and restores unchanged replacements on rollback. Later administrator edits are preserved.
