export const CMS_MEDIA_KINDS = ['hero', 'promotion', 'journal'] as const;
export type CmsMediaKind = (typeof CMS_MEDIA_KINDS)[number];

export const CMS_MEDIA_VARIANTS: Record<CmsMediaKind, readonly string[]> = {
  hero: ['desktop', 'mobile'],
  promotion: ['full', 'card'],
  journal: ['thumbnail'],
};

export const CMS_MEDIA_WIDTHS: Record<CmsMediaKind, Record<string, number>> = {
  hero: { desktop: 1920, mobile: 768 },
  promotion: { full: 1440, card: 640 },
  journal: { thumbnail: 640 },
};

export function isCmsMediaKind(value: string): value is CmsMediaKind {
  return CMS_MEDIA_KINDS.some((kind) => kind === value);
}
