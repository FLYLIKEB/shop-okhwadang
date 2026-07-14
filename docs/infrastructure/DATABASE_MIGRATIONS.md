# Database migration map

This index turns `backend/src/database/migrations` into an operator-readable map. Use it before adding a new migration, when bootstrapping a new environment, or when deciding whether a change belongs in a schema migration, a forward-only backfill, or the seed runner.

## Classification rules

| Kind | When to use it | Rollback expectation |
| --- | --- | --- |
| `schema` | Table/column/index/enum shape changes required for application boot. | Reversible when practical. |
| `schema + backfill` | Historical debt where one migration changed schema and also rewrote existing rows. Avoid for new work unless deploy safety requires same-step backfill. | Usually partial/forward-only; call it out in the migration body. |
| `backfill` | Forward-only data repair or normalization against already-existing rows. Prefer idempotent SQL and `down()` no-op. | Forward-only by default. |
| `seed baseline` | Static bootstrap content/settings that new environments need immediately. Prefer `backend/src/database/seeds` when runtime boot does not depend on the rows existing at migration time. | Usually forward-only. |
| `safety patch` | Follow-up guardrail for older environments with drift or partially-applied history. | Keep narrow and idempotent. |

## Stack summary

- Total migration files: **106**
- Oldest migration: `1711100000000-CreateUsersTable.ts`
- Newest migration: `1786500000000-AddOrderCancellationFields.ts`
- Seed runner entrypoint: `backend/src/database/seeds/run-seed.ts`

### By kind

- **backfill**: 20
- **safety patch**: 1
- **schema**: 70
- **schema + backfill**: 6
- **seed baseline**: 9

### By domain

| Domain | Count | First files to inspect |
| --- | ---: | --- |
| CMS, navigation & localization | 42 | `1774600000000-AddPagesAndPageBlocks.ts`<br>`1774700000000-AddNavigationItems.ts`<br>`1775000000000-CreateNoticesFaqsInquiries.ts` |
| Catalog, search & merchandising | 25 | `1711234567890-AddProductsAndCategories.ts`<br>`1745500000000-AddCategoryNameTranslations.ts`<br>`1774500000000-AddReviewsTable.ts` |
| Commerce checkout & fulfillment | 22 | `1774422597135-AddCartItemsTable.ts`<br>`1774425466051-AddOrdersTables.ts`<br>`1774425995915-AddPaymentsShippingTables.ts` |
| Identity & account security | 10 | `1711100000000-CreateUsersTable.ts`<br>`1743360000000-AddLoginLockFields.ts`<br>`1774499861060-CreateUserAuthenticationsTable.ts` |
| Operations & observability | 7 | `1775100000000-AddPerformanceIndexes.ts`<br>`1781000000001-CreateSchedulerLocksTable.ts`<br>`1781000000002-AddSchedulerSiteSettings.ts` |

## Operating rules for new migrations

1. **Schema first, seed runner second.** If a new environment can be bootstrapped by `npm run seed`, keep content/bootstrap rows in `backend/src/database/seeds` instead of burying them in another migration chain.
2. **Backfills must be explicit.** Name the file with `Backfill`, `Normalize`, `Deduplicate`, `Align`, or `Fix` so operators know it rewrites data.
3. **Avoid mixed migrations.** Several older files combine enum/table changes with row rewrites. Prefer a schema migration followed by a separate backfill unless deploy safety requires one file.
4. **Safety patches stay narrow.** Follow-up migrations like `EnsureReviewReplyColumns` should explain which older environments they protect and remain idempotent.
5. **Document seed-vs-backfill intent in the PR.** The migration filename alone is not enough when changing CMS/static content.

## Consolidation candidates

- **CMS/i18n backfill chain** — the `1777000000000` through `1785700000000` content/localization migrations are the heaviest source of bootstrap noise. A future baseline snapshot can collapse those into schema + seed data for fresh installs while keeping only forward-only repair migrations for production drift.
- **Catalog normalization chain** — attribute/filter cleanup migrations (`1785300000000`, `1785400000000`, `1785800000000`, `1785900000000`, `1786100000000`, `1786400000000`) should eventually fold into a cleaner baseline once every active environment has crossed them.
- **Gateway enum evolution** — Stripe/PayPal/Eximbay enum migrations are valid history, but new gateways should keep enum expansion separate from row promotion so payment-state audits stay readable.

## Full migration index

| # | Migration file | Domain | Kind | Summary |
| ---: | --- | --- | --- | --- |
| 1 | `1711100000000-CreateUsersTable.ts` | Identity & account security | `schema` | Create Users Table |
| 2 | `1711234567890-AddProductsAndCategories.ts` | Catalog, search & merchandising | `schema` | Add Products And Categories |
| 3 | `1743360000000-AddLoginLockFields.ts` | Identity & account security | `schema` | Add Login Lock Fields |
| 4 | `1745500000000-AddCategoryNameTranslations.ts` | Catalog, search & merchandising | `schema` | Add Category Name Translations |
| 5 | `1774422597135-AddCartItemsTable.ts` | Commerce checkout & fulfillment | `schema` | Add Cart Items Table |
| 6 | `1774425466051-AddOrdersTables.ts` | Commerce checkout & fulfillment | `schema` | Add Orders Tables |
| 7 | `1774425995915-AddPaymentsShippingTables.ts` | Commerce checkout & fulfillment | `schema` | Add Payments Shipping Tables |
| 8 | `1774499861060-CreateUserAuthenticationsTable.ts` | Identity & account security | `schema` | Create User Authentications Table |
| 9 | `1774500000000-AddReviewsTable.ts` | Catalog, search & merchandising | `schema` | Add Reviews Table |
| 10 | `1774502521605-CreateUserAddressesTable.ts` | Identity & account security | `schema` | Create User Addresses Table |
| 11 | `1774510727813-AddProductNameFulltextIndex.ts` | Catalog, search & merchandising | `schema` | Add Product Name Fulltext Index |
| 12 | `1774515000000-UpdateShippingAddInTransit.ts` | Commerce checkout & fulfillment | `schema` | Update Shipping Add In Transit |
| 13 | `1774600000000-AddPagesAndPageBlocks.ts` | CMS, navigation & localization | `schema` | Add Pages And Page Blocks |
| 14 | `1774700000000-AddNavigationItems.ts` | CMS, navigation & localization | `schema` | Add Navigation Items |
| 15 | `1774800000000-CreateWishlistTable.ts` | Catalog, search & merchandising | `schema` | Create Wishlist Table |
| 16 | `1774900000000-CreateCouponsTable.ts` | Commerce checkout & fulfillment | `schema` | Create Coupons Table |
| 17 | `1775000000000-CreateNoticesFaqsInquiries.ts` | CMS, navigation & localization | `schema` | Create Notices Faqs Inquiries |
| 18 | `1775100000000-AddPerformanceIndexes.ts` | Operations & observability | `schema` | Add Performance Indexes |
| 19 | `1775200000000-CreatePromotionsBannersTable.ts` | CMS, navigation & localization | `schema` | Create Promotions Banners Table |
| 20 | `1775250000000-AddNavigationIndexes.ts` | CMS, navigation & localization | `schema` | Add Navigation Indexes |
| 21 | `1775300000000-CreateSiteSettingsTable.ts` | CMS, navigation & localization | `schema` | Create Site Settings Table |
| 22 | `1775400000000-AddMissingThemeDefaults.ts` | CMS, navigation & localization | `schema` | Add Missing Theme Defaults |
| 23 | `1775500000000-AddCategoryDescription.ts` | Catalog, search & merchandising | `schema` | Add Category Description |
| 24 | `1775500000001-UpdateThemeColorsOkhwadang.ts` | CMS, navigation & localization | `backfill` | Update Theme Colors Okhwadang |
| 25 | `1775600000000-UpdateThemeColorsPremiumBW.ts` | CMS, navigation & localization | `backfill` | Update Theme Colors Premium B W |
| 26 | `1775700000000-AddProductI18nFields.ts` | Catalog, search & merchandising | `schema` | Add Product I18n Fields |
| 27 | `1775800000000-AddCmsI18nFields.ts` | CMS, navigation & localization | `schema` | Add Cms I18n Fields |
| 28 | `1775900000000-UpdateThemeColorsMinimalLuxury.ts` | CMS, navigation & localization | `backfill` | Update Theme Colors Minimal Luxury |
| 29 | `1776000000000-AddProductDetailImagesTable.ts` | Catalog, search & merchandising | `schema` | Add Product Detail Images Table |
| 30 | `1776000000001-UnifyCardAndBackgroundColor.ts` | CMS, navigation & localization | `schema + backfill` | Unify Card And Background Color |
| 31 | `1776100000000-AddCollectionsTable.ts` | CMS, navigation & localization | `schema` | Add Collections Table |
| 32 | `1776200000000-AddClayTypeAndShapeToProducts.ts` | Catalog, search & merchandising | `schema` | Add Clay Type And Shape To Products |
| 33 | `1776250000000-CreateArchivesTables.ts` | CMS, navigation & localization | `schema` | Create Archives Tables |
| 34 | `1776300000000-CreateJournalEntriesTable.ts` | CMS, navigation & localization | `schema` | Create Journal Entries Table |
| 35 | `1776400000000-SeedCustomerServicePages.ts` | CMS, navigation & localization | `seed baseline` | Seed Customer Service Pages |
| 36 | `1776500000000-RefactorToDynamicAttributes.ts` | Catalog, search & merchandising | `schema + backfill` | Refactor To Dynamic Attributes |
| 37 | `1776600000000-AddEnglishColumns.ts` | CMS, navigation & localization | `schema` | Add English Columns |
| 38 | `1776656402451-AddRefundsTable.ts` | Commerce checkout & fulfillment | `schema` | Add Refunds Table |
| 39 | `1776700000000-AddNiloTypesRegionEn.ts` | CMS, navigation & localization | `schema` | Add Nilo Types Region En |
| 40 | `1776800000000-SeedEnglishValues.ts` | CMS, navigation & localization | `seed baseline` | Seed English Values |
| 41 | `1776900000000-SeedArchivesAndCollections.ts` | CMS, navigation & localization | `seed baseline` | Seed Archives And Collections |
| 42 | `1777000000000-AddSiteSettingsValueEn.ts` | CMS, navigation & localization | `backfill` | Add Site Settings Value En |
| 43 | `1777100000000-UpsertPageBlockTranslationFields.ts` | CMS, navigation & localization | `backfill` | Upsert Page Block Translation Fields |
| 44 | `1777200000000-UpsertRemainingPageBlockEnFields.ts` | CMS, navigation & localization | `backfill` | Upsert Remaining Page Block EN Fields |
| 45 | `1778000000000-AddI18nColumnsAndBackfill.ts` | CMS, navigation & localization | `schema + backfill` | Add I18n Columns And Backfill |
| 46 | `1778100000000-AddNiloCharacteristicsEn.ts` | CMS, navigation & localization | `schema` | Add Nilo Characteristics En |
| 47 | `1778200000000-CollectionEnBackfillAndOverride.ts` | CMS, navigation & localization | `backfill` | Collection EN Backfill And Override |
| 48 | `1778300000000-RemoveRemainingCjkAndBackfillLegacy.ts` | CMS, navigation & localization | `backfill` | Remove Remaining Cjk And Backfill Legacy |
| 49 | `1778400000000-AddOrderStatusCompletedAndRefundRequested.ts` | Commerce checkout & fulfillment | `schema` | Add Order Status Completed And Refund Requested |
| 50 | `1778400000001-CreatePasswordResetTokensTable.ts` | Identity & account security | `schema` | Create Password Reset Tokens Table |
| 51 | `1778500000000-CreateTokenBlacklistTable.ts` | Identity & account security | `schema` | Create Token Blacklist Table |
| 52 | `1780000000000-AddEmailVerificationFields.ts` | Identity & account security | `schema` | Add Email Verification Fields |
| 53 | `1780000000001-CreateVerificationTokensTable.ts` | Identity & account security | `schema` | Create Verification Tokens Table |
| 54 | `1781000000000-AddPointHistoryExpiresAt.ts` | Commerce checkout & fulfillment | `schema` | Add Point History Expires At |
| 55 | `1781000000001-CreateSchedulerLocksTable.ts` | Operations & observability | `schema` | Create Scheduler Locks Table |
| 56 | `1781000000002-AddSchedulerSiteSettings.ts` | Operations & observability | `schema` | Add Scheduler Site Settings |
| 57 | `1781500000000-CreateAuditLogsTable.ts` | Operations & observability | `schema` | Create Audit Logs Table |
| 58 | `1782000000000-AddUserDeletionAndLoginFailureFields.ts` | Identity & account security | `schema` | Add User Deletion And Login Failure Fields |
| 59 | `1782100000000-AddInquiryNotificationColumns.ts` | Commerce checkout & fulfillment | `schema` | Add Inquiry Notification Columns |
| 60 | `1782200000000-AddReviewPointSettings.ts` | Commerce checkout & fulfillment | `schema` | Add Review Point Settings |
| 61 | `1782300000000-CreateRestockAlertsTable.ts` | Commerce checkout & fulfillment | `schema` | Create Restock Alerts Table |
| 62 | `1782400000000-AddPointHistoryRelatedEntityColumns.ts` | Commerce checkout & fulfillment | `schema` | Add Point History Related Entity Columns |
| 63 | `1782400000001-AddShippingPolicySettings.ts` | Commerce checkout & fulfillment | `schema` | Add Shipping Policy Settings |
| 64 | `1782500000000-AddMembershipTierSystem.ts` | Identity & account security | `schema` | Add Membership Tier System |
| 65 | `1782500000001-CreateRecentlyViewedProductsTable.ts` | Catalog, search & merchandising | `schema` | Create Recently Viewed Products Table |
| 66 | `1782600000000-CreateCouponRulesTable.ts` | Commerce checkout & fulfillment | `schema` | Create Coupon Rules Table |
| 67 | `1782700000000-CreateAnnouncementBarsTable.ts` | CMS, navigation & localization | `schema` | Create Announcement Bars Table |
| 68 | `1783000000000-AddDarkModeColorSettings.ts` | CMS, navigation & localization | `seed baseline` | Add Dark Mode Color Settings |
| 69 | `1783100000000-AddProductReviewStats.ts` | Catalog, search & merchandising | `schema` | Add Product Review Stats |
| 70 | `1783200000000-CreateExternalReviewsTable.ts` | Catalog, search & merchandising | `schema` | Create External Reviews Table |
| 71 | `1783300000000-AddStripeGatewayEnum.ts` | Commerce checkout & fulfillment | `schema + backfill` | Add Stripe Gateway Enum |
| 72 | `1783300000000-BackfillPromotionBannerEnglishSeedData.ts` | CMS, navigation & localization | `backfill` | Backfill Promotion Banner English Seed Data |
| 73 | `1783400000000-AddNaverpayGatewayEnum.ts` | Commerce checkout & fulfillment | `schema` | Add Naverpay Gateway Enum |
| 74 | `1783500000000-CreatePaymentWebhookEvents.ts` | Operations & observability | `schema` | Create Payment Webhook Events |
| 75 | `1783600000000-AddAuditLogRetentionPolicy.ts` | Operations & observability | `schema` | Add Audit Log Retention Policy |
| 76 | `1783700000000-FixArtistKoreanSeedText.ts` | CMS, navigation & localization | `backfill` | Fix Artist Korean Seed Text |
| 77 | `1783800000000-CreateBestSellersCmsPage.ts` | CMS, navigation & localization | `seed baseline` | Create Best Sellers Cms Page |
| 78 | `1783900000000-AddPaypalPaymentEnums.ts` | Commerce checkout & fulfillment | `schema` | Add Paypal Payment Enums |
| 79 | `1783900000001-AlignProductAttributeFilterValues.ts` | Catalog, search & merchandising | `backfill` | Align Product Attribute Filter Values |
| 80 | `1784000000000-CreateArchiveCollectionCmsPages.ts` | CMS, navigation & localization | `seed baseline` | Create Archive Collection Cms Pages |
| 81 | `1784100000000-AddProductFreeShipping.ts` | Commerce checkout & fulfillment | `schema` | Add Product Free Shipping |
| 82 | `1784200000000-MigrateArchiveCollectionToGenericBlocks.ts` | CMS, navigation & localization | `schema + backfill` | Migrate Archive Collection To Generic Blocks |
| 83 | `1784300000000-UpdateThemeColorsGrayscale.ts` | CMS, navigation & localization | `backfill` | Update Theme Colors Grayscale |
| 84 | `1784400000000-RefreshPolicyCmsPages.ts` | CMS, navigation & localization | `seed baseline` | Refresh Policy Cms Pages |
| 85 | `1784500000000-AddBusinessInfoSettings.ts` | CMS, navigation & localization | `seed baseline` | Add Business Info Settings |
| 86 | `1784600000000-AddCustomerCenterLunchHolidaySettings.ts` | CMS, navigation & localization | `seed baseline` | Add Customer Center Lunch Holiday Settings |
| 87 | `1784700000000-AddProductNoticeInfo.ts` | Catalog, search & merchandising | `schema` | Add Product Notice Info |
| 88 | `1784800000000-AddNotificationLogs.ts` | Operations & observability | `schema` | Add Notification Logs |
| 89 | `1784900000000-AddOrderServiceRequestsAndProductInquiry.ts` | Commerce checkout & fulfillment | `schema` | Add Order Service Requests And Product Inquiry |
| 90 | `1785000000000-BackfillCmsPageEnglishContent.ts` | CMS, navigation & localization | `backfill` | Backfill Cms Page English Content |
| 91 | `1785100000000-FixPositiveReviewPointRevocations.ts` | Commerce checkout & fulfillment | `backfill` | Fix Positive Review Point Revocations |
| 92 | `1785200000000-AddExternalReviewAdminFields.ts` | Catalog, search & merchandising | `schema` | Add External Review Admin Fields |
| 93 | `1785300000000-AddKeywordMappingAttributeTypes.ts` | Catalog, search & merchandising | `schema` | Add Keyword Mapping Attribute Types |
| 94 | `1785400000000-NormalizeAttributeFilterUrls.ts` | Catalog, search & merchandising | `backfill` | Normalize Attribute Filter Urls |
| 95 | `1785500000000-AddReviewRepliesAndAttributeLinks.ts` | Catalog, search & merchandising | `schema + backfill` | Add Review Replies And Attribute Links |
| 96 | `1785500001000-EnsureReviewReplyColumns.ts` | Catalog, search & merchandising | `safety patch` | Ensure Review Reply Columns |
| 97 | `1785600000000-AddProductLocaleVisibility.ts` | Catalog, search & merchandising | `schema` | Add Product Locale Visibility |
| 98 | `1785700000000-BackfillArchiveArtistHrefLabelEn.ts` | CMS, navigation & localization | `backfill` | Backfill Archive Artist Href Label En |
| 99 | `1785800000000-DeduplicateAttributeValueOptions.ts` | Catalog, search & merchandising | `backfill` | Deduplicate Attribute Value Options |
| 100 | `1785900000000-DeduplicateCollectionFilterOptions.ts` | CMS, navigation & localization | `backfill` | Deduplicate Collection Filter Options |
| 101 | `1786000000000-RetireLegacyCollectionsTable.ts` | CMS, navigation & localization | `schema` | Retire Legacy Collections Table |
| 102 | `1786100000000-NormalizeAttributeDisplayLabels.ts` | Catalog, search & merchandising | `backfill` | Normalize Attribute Display Labels |
| 103 | `1786200000000-AddEximbayPaymentEnums.ts` | Commerce checkout & fulfillment | `schema` | Add Eximbay Payment Enums |
| 104 | `1786300000000-AddAttributeValueOptions.ts` | Catalog, search & merchandising | `schema` | Add Attribute Value Options |
| 105 | `1786400000000-MarkAllAttributesFilterable.ts` | Catalog, search & merchandising | `backfill` | Mark All Attributes Filterable |
| 106 | `1786500000000-AddOrderCancellationFields.ts` | Commerce checkout & fulfillment | `schema` | Add Order Cancellation Fields |

## Seed/backfill boundary reference

- Use **migrations** when application code or deploy-time invariants require the change before the next process boots.
- Use **`backend/src/database/seeds`** for static content, demo data, and bootstrap rows that can be replayed safely in new environments.
- When a deploy needs both, keep the migration focused on minimal invariants and leave richer content hydration to the seed runner or a dedicated operator script.
