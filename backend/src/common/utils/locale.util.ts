const LOCALE_SUFFIX_MAP: Record<string, string> = {
  ko: 'Ko',
  en: 'En',
  ja: 'Ja',
  zh: 'Zh',
};

const LOCALE_SNAKE_SUFFIX_MAP: Record<string, string> = {
  ko: 'ko',
  en: 'en',
  ja: 'ja',
  zh: 'zh',
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

/**
 * JSON content 객체의 다국어 필드를 locale에 맞게 매핑한다.
 * content에 `title_en`, `title_ja`가 있으면 title 을 덮어쓴다.
 * 배열(slides 등)은 재귀적으로 처리.
 */
export function applyLocaleToContent<T>(
  content: T,
  locale: string | undefined,
): T {
  if (!locale || locale === 'ko') return content;
  const snakeSuffix = LOCALE_SNAKE_SUFFIX_MAP[locale];
  if (!snakeSuffix) return content;

  if (Array.isArray(content)) {
    return content.map((item) => applyLocaleToContent(item, locale)) as unknown as T;
  }

  if (!content || typeof content !== 'object') return content;

  const source = content as Record<string, unknown>;
  const result: Record<string, unknown> = { ...source };

  for (const [key, value] of Object.entries(source)) {
    const suffixMatch = `_${snakeSuffix}`;
    if (key.endsWith(suffixMatch)) {
      const baseKey = key.slice(0, -suffixMatch.length);
      if (value !== null && value !== undefined && value !== '') {
        result[baseKey] = value;
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => applyLocaleToContent(item, locale));
    } else if (value && typeof value === 'object') {
      result[key] = applyLocaleToContent(value, locale);
    }
  }

  return result as T;
}
