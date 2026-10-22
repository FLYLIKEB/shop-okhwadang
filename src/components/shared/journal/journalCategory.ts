import { JournalCategory } from '@/lib/api';

export const JOURNAL_CATEGORY_KEY_MAP = {
  [JournalCategory.CULTURE]: 'culture',
  [JournalCategory.USAGE]: 'usage',
  [JournalCategory.TABLE_SETTING]: 'tableSetting',
  [JournalCategory.NEWS]: 'news',
} as const satisfies Record<JournalCategory, string>;

type JournalCategoryMessageKey = (typeof JOURNAL_CATEGORY_KEY_MAP)[JournalCategory];

const LEGACY_CATEGORY_KEY_MAP: Record<string, JournalCategoryMessageKey> = {
  다문화: 'culture',
  사용법: 'usage',
  '찻자리 세팅': 'tableSetting',
  소식: 'news',
};

export function getJournalCategoryMessageKey(
  category: string | null | undefined,
): JournalCategoryMessageKey | 'uncategorized' {
  if (category && Object.hasOwn(JOURNAL_CATEGORY_KEY_MAP, category)) {
    return JOURNAL_CATEGORY_KEY_MAP[category as JournalCategory];
  }
  if (category && Object.hasOwn(LEGACY_CATEGORY_KEY_MAP, category)) {
    return LEGACY_CATEGORY_KEY_MAP[category];
  }
  return 'uncategorized';
}
