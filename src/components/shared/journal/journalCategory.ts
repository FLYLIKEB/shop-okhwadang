import { JournalCategory } from '@/lib/api';

export const JOURNAL_CATEGORY_KEY_MAP: Record<JournalCategory, string> = {
  [JournalCategory.CULTURE]: 'culture',
  [JournalCategory.USAGE]: 'usage',
  [JournalCategory.TABLE_SETTING]: 'tableSetting',
  [JournalCategory.NEWS]: 'news',
};

export function getJournalCategoryMessageKey(category: JournalCategory): string {
  return JOURNAL_CATEGORY_KEY_MAP[category];
}
