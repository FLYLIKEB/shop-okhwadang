export const NAVER_SMARTSTORE_REVIEW_SOURCE = 'naver-smartstore' as const;
export const LEGACY_SMARTSTORE_REVIEW_SOURCE = 'smartstore' as const;

export type SmartStoreReviewSource =
  typeof NAVER_SMARTSTORE_REVIEW_SOURCE | typeof LEGACY_SMARTSTORE_REVIEW_SOURCE;

export function buildNaverExternalProductKey(
  externalProductId: string | number | null | undefined,
): string | null {
  if (externalProductId === null || externalProductId === undefined) return null;
  const raw = String(externalProductId).trim();
  if (!raw) return null;
  return raw.startsWith('naver-') ? raw : `naver-${raw}`;
}
