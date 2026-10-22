import { describe, expect, it } from 'vitest';
import { JournalCategory } from '@/lib/api';
import { getJournalCategoryMessageKey } from '@/components/shared/journal/journalCategory';
import { createTranslator } from 'next-intl';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';

describe('getJournalCategoryMessageKey', () => {
  it('maps every journal category to a translation key', () => {
    expect(getJournalCategoryMessageKey(JournalCategory.CULTURE)).toBe('culture');
    expect(getJournalCategoryMessageKey(JournalCategory.USAGE)).toBe('usage');
    expect(getJournalCategoryMessageKey(JournalCategory.TABLE_SETTING)).toBe('tableSetting');
    expect(getJournalCategoryMessageKey(JournalCategory.NEWS)).toBe('news');
  });

  it.each([
    ['다문화', 'culture'],
    ['사용법', 'usage'],
    ['찻자리 세팅', 'tableSetting'],
    ['소식', 'news'],
    [null, 'uncategorized'],
    [undefined, 'uncategorized'],
    ['', 'uncategorized'],
    ['unknown', 'uncategorized'],
    ['constructor', 'uncategorized'],
  ])('resolves API category %s to a valid localized message', (category, key) => {
    expect(getJournalCategoryMessageKey(category)).toBe(key);
    for (const [locale, messages] of Object.entries({ ko, en })) {
      const translate = createTranslator({
        locale,
        messages,
        namespace: 'journalCategories',
        onError: (error) => { throw error; },
      });
      expect(translate(getJournalCategoryMessageKey(category))).toBe(
        messages.journalCategories[key as keyof typeof messages.journalCategories],
      );
    }
  });
});
