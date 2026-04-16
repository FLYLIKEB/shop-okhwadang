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

const MAX_CONTENT_DEPTH = 16;

/**
 * 엔티티의 다국어 필드를 locale에 맞게 매핑한다.
 * locale이 'ko'이거나 없으면 원본 그대로 반환.
 * *_En 값이 null/undefined/빈 문자열이면 base 유지.
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
    if (localizedValue !== null && localizedValue !== undefined && localizedValue !== '') {
      overrides[field] = localizedValue;
    }
  }

  return { ...entity, ...overrides } as T;
}

/**
 * JSON content 객체의 다국어 필드를 locale에 맞게 매핑한다.
 * content에 `title_en`, `title_ja`가 있으면 title 을 덮어쓴다.
 * 배열(slides 등)은 재귀적으로 처리.
 *
 * 안전장치:
 * - 재귀 깊이 MAX_CONTENT_DEPTH 초과 시 원본 반환
 * - 순환 참조 감지 시 원본 반환 (WeakSet seen tracker)
 * - Date/Buffer/Map/Set은 원본 유지 (plain object만 재귀)
 * - *_{locale} 값이 null/undefined/빈 문자열이면 base 유지
 * - 2-pass: 먼저 suffix 오버라이드 수집, 그 후 base 필드 재귀 → 순서 의존성 제거
 */
export function applyLocaleToContent<T>(
  content: T,
  locale: string | undefined,
): T {
  if (!locale || locale === 'ko') return content;
  const snakeSuffix = LOCALE_SNAKE_SUFFIX_MAP[locale];
  if (!snakeSuffix) return content;

  return applyLocaleRecursive(content, snakeSuffix, new WeakSet(), 0) as T;
}

function applyLocaleRecursive(
  value: unknown,
  snakeSuffix: string,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (depth > MAX_CONTENT_DEPTH) return value;
  if (value === null || typeof value !== 'object') return value;

  // plain object / array 이외(Date, Buffer, Map, Set, RegExp 등)는 원본 유지
  if (!isPlainObjectOrArray(value)) return value;
  if (seen.has(value as object)) return value;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => applyLocaleRecursive(item, snakeSuffix, seen, depth + 1));
  }

  const source = value as Record<string, unknown>;
  const suffixMatch = `_${snakeSuffix}`;

  // Pass 1: 모든 *_{suffix} 키를 수집 — iteration 순서에 무관
  const overrides: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(source)) {
    if (key.endsWith(suffixMatch)) {
      const baseKey = key.slice(0, -suffixMatch.length);
      if (v !== null && v !== undefined && v !== '') {
        overrides[baseKey] = v;
      }
    }
  }

  // Pass 2: 기본 필드는 재귀 처리, 오버라이드가 있으면 해당 값으로 대체
  const result: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(source)) {
    if (key in overrides) {
      result[key] = overrides[key];
    } else if (Array.isArray(v) || (v && typeof v === 'object')) {
      result[key] = applyLocaleRecursive(v, snakeSuffix, seen, depth + 1);
    } else {
      result[key] = v;
    }
  }

  return result;
}

function isPlainObjectOrArray(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
