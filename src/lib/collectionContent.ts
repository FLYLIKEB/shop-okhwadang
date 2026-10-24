import type { PageBlock } from '@/lib/api';
import type { AttributeFilterGroup, AttributeFilterOption } from '@/lib/attributeFilterOptions';
import { compactDisplayLabel } from '@/lib/collectionDisplay';
import { normalizeClayKey } from '@/utils/clayTaxonomy';
import koMessages from '@/i18n/messages/ko.json';

function cleanLabel(value: string): string {
  return compactDisplayLabel(value.replace(/\([^)]*[a-z][^)]*\)/gi, '')).trim();
}

function comparisonLabel(value: string, code: string): string {
  const label = cleanLabel(value).toLowerCase();
  return code === 'teapot_shape' ? label.replace(/호$/, '') : label;
}

function exactClayAlias(value: string) {
  const label = cleanLabel(value);
  const key = normalizeClayKey(label);
  // The shared resolver matches substrings; reject extra prefixes/suffixes that identify subtypes.
  return key !== null && normalizeClayKey(label.slice(1)) !== key
    && normalizeClayKey(label.slice(0, -1)) !== key ? key : null;
}

function attributeValues(href: unknown, code: string): string[] {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return [];
  try {
    const url = new URL(href, 'https://ockhwadang.com');
    if (url.origin !== 'https://ockhwadang.com' || !/^\/(?:ko\/|en\/)?products\/?$/.test(url.pathname)) return [];
    return (url.searchParams.get('attrs') ?? '').split(',')
      .filter((value) => value.startsWith(`${code}:`))
      .map((value) => value.slice(code.length + 1));
  } catch {
    return [];
  }
}

function findOption(item: Record<string, unknown>, code: string, names: string[], options: AttributeFilterOption[]) {
  const values = attributeValues(item.href, code);
  const exact = options.find((option) => values.includes(option.value))
    ?? options.find((option) => names.some((name) =>
      comparisonLabel(name, code) === comparisonLabel(option.label, code)
      || comparisonLabel(name, code) === comparisonLabel(option.value, code)));
  if (exact || code !== 'clay_type') return exact;

  // Limit alias matching to bare romanized/Hanja names so an unknown clay subtype stays distinct.
  const aliases = names.map(cleanLabel).filter((name) => /^[a-z\u3400-\u9fff]+$/i.test(name));
  const keys = aliases.map(exactClayAlias).filter((key) => key !== null);
  return options.find((option) => {
    const key = exactClayAlias(option.label) ?? exactClayAlias(option.value);
    return key !== null && keys.includes(key);
  });
}

export function normalizeCollectionBlocks(blocks: PageBlock[], locale: string, groups: AttributeFilterGroup[]): PageBlock[] {
  const seen = new Map<string, Record<string, unknown>>();

  return blocks.map((block) => {
    const code = block.type === 'color_card_list' ? 'clay_type'
      : block.type === 'image_card_grid' ? 'teapot_shape' : null;
    if (!block.is_visible || !code || !Array.isArray(block.content.items)) return block;
    const options = groups.find((group) => group.code === code)?.options ?? [];
    const items = block.content.items.flatMap((item: unknown) => {
      if (!item || typeof item !== 'object') return [item];
      const source = item as Record<string, unknown>;
      const names = [source.nameKo, source.name, source.nameEn]
        .filter((name): name is string => typeof name === 'string' && Boolean(name.trim()));
      const option = findOption(source, code, names, options);
      const label = option?.label ?? names.find((name) => /[가-힣]/.test(name)) ?? names[0];
      const key = option?.value ?? (label ? comparisonLabel(label, code) : null);
      const identity = key ? `${code}:${key}` : null;
      const previous = identity ? seen.get(identity) : undefined;
      if (previous) {
        if (!(typeof previous.imageUrl === 'string' && previous.imageUrl.trim())
          && typeof source.imageUrl === 'string' && source.imageUrl.trim()) previous.imageUrl = source.imageUrl;
        return [];
      }

      const normalized = { ...source };
      if (locale === 'ko' && label) {
        const name = cleanLabel(label);
        normalized.name = name;
        normalized.nameKo = name;
        normalized.nameEn = '';
        normalized.hrefLabel = koMessages.collectionPage.itemLink.replace('{name}', name);
      }
      if (identity) seen.set(identity, normalized);
      return [normalized];
    });
    return { ...block, content: { ...block.content, items } };
  });
}
