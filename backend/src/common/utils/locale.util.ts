const LOCALE_SUFFIX_MAP: Record<string, string> = {
  ko: 'Ko',
  en: 'En',
  ja: 'Ja',
  zh: 'Zh',
};

/**
 * 엔티티의 다국어 필드를 locale에 맞게 매핑한다.
 * locale이 'ko'이거나 없으면 원본 그대로 반환.
 */
export function applyLocale<T>(
  entity: T,
  locale: string | undefined,
  fields: string[],
): T {
  if (!locale || locale === 'ko') return entity;
  const suffix = LOCALE_SUFFIX_MAP[locale];
  if (!suffix) return entity;

  const overrides: Record<string, unknown> = {};
  for (const field of fields) {
    const localizedKey = `${field}${suffix}`;
    const localizedValue = (entity as Record<string, unknown>)[localizedKey];
    if (localizedValue !== null && localizedValue !== undefined) {
      overrides[field] = localizedValue;
    }
  }

  return { ...entity, ...overrides } as T;
}
