'use client';

import { useTranslations } from 'next-intl';
import type { Collection } from '@/lib/api';
import SegmentedOptionGroup from '@/components/shared/ui/SegmentedOptionGroup';
import { getCompactCollectionLabel } from '@/lib/collectionDisplay';
import { getCollectionFilterValue } from '@/lib/collectionFilters';

interface ClayTypeFilterProps {
  collections: Collection[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}

export default function ClayTypeFilter({ collections, selected, onSelect }: ClayTypeFilterProps) {
  const tCommon = useTranslations('common');
  const tFilters = useTranslations('filters');

  return (
    <SegmentedOptionGroup
      items={[
        { label: tCommon('all'), value: '' },
        ...collections.map((item) => ({
          label: getCompactCollectionLabel(item),
          value: getCollectionFilterValue(item, 'clay_type'),
        })),
      ]}
      value={selected ?? ''}
      onToggle={(value) => onSelect(value === selected ? undefined : value || undefined)}
      ariaLabel={tFilters('clayAria')}
      size="xs"
      radius="full"
      tone="primary"
    />
  );
}
