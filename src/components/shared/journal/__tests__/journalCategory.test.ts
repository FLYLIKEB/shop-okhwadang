import { describe, expect, it } from 'vitest';
import { JournalCategory } from '@/lib/api';
import { getJournalCategoryMessageKey } from '@/components/shared/journal/journalCategory';

describe('getJournalCategoryMessageKey', () => {
  it('maps every journal category to a translation key', () => {
    expect(getJournalCategoryMessageKey(JournalCategory.CULTURE)).toBe('culture');
    expect(getJournalCategoryMessageKey(JournalCategory.USAGE)).toBe('usage');
    expect(getJournalCategoryMessageKey(JournalCategory.TABLE_SETTING)).toBe('tableSetting');
    expect(getJournalCategoryMessageKey(JournalCategory.NEWS)).toBe('news');
  });
});
