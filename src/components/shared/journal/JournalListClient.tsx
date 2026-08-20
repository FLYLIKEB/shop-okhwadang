'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { TEAPOT_IMAGES } from '@/lib/teapot-images';
import { journalsApi, type Journal, JournalCategory } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import SegmentedOptionGroup from '@/components/shared/ui/SegmentedOptionGroup';
import JournalCard from '@/components/shared/journal/JournalCard';
import { getJournalCategoryMessageKey } from '@/components/shared/journal/journalCategory';

const ALL_CATEGORY = 'ALL';
type JournalCategoryFilter = JournalCategory | typeof ALL_CATEGORY;

function CategoryFilter({
  selected,
  onSelect,
}: {
  selected: JournalCategoryFilter;
  onSelect: (category: JournalCategory | null) => void;
}) {
  const tCommon = useTranslations('common');
  const tCategory = useTranslations('journalCategories');
  const tJournal = useTranslations('journalPage');

  return (
    <SegmentedOptionGroup
      items={[
        { label: tCommon('all'), value: ALL_CATEGORY },
        ...Object.values(JournalCategory).map((category) => ({
          label: tCategory(getJournalCategoryMessageKey(category)),
          value: category,
        })),
      ]}
      value={selected}
      onToggle={(value) => onSelect(value === ALL_CATEGORY ? null : value)}
      ariaLabel={tJournal('categoryFilter')}
      className="justify-center"
      size="sm"
      radius="full"
      tone="inverted"
    />
  );
}

export default function JournalListClient() {
  const locale = useLocale();
  const tCategory = useTranslations('journalCategories');
  const tJournal = useTranslations('journalPage');
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<JournalCategory | null>(null);

  useEffect(() => {
    async function loadJournals() {
      try {
        setLoading(true);
        const data = await journalsApi.getAll(undefined, locale);
        setJournals(data);
      } catch (err) {
        setError(handleApiError(err, tJournal('loadError')));
      } finally {
        setLoading(false);
      }
    }

    void loadJournals();
  }, [locale, tJournal]);

  const filtered = selectedCategory
    ? journals.filter((journal) => journal.category === selectedCategory)
    : journals;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-sm text-destructive py-20">{error}</p>;
  }

  return (
    <>
      <div className="mb-10 border-b border-soft pb-6">
        <CategoryFilter selected={selectedCategory ?? ALL_CATEGORY} onSelect={setSelectedCategory} />
      </div>

      {filtered.length === 0 ? (
        <p className="py-20 text-center typo-body-sm text-muted-foreground">
          {tJournal('emptyCategory')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((journal, index) => (
            <JournalCard
              key={journal.id}
              journal={journal}
              fallbackImageUrl={TEAPOT_IMAGES[index % TEAPOT_IMAGES.length].src}
              categoryLabel={tCategory(getJournalCategoryMessageKey(journal.category))}
              variant="list"
            />
          ))}
        </div>
      )}
    </>
  );
}
