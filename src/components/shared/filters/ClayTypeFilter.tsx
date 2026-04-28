'use client';

import { useTranslations } from 'next-intl';
import type { Collection } from '@/lib/api';
import SegmentedOptionGroup from '@/components/shared/ui/SegmentedOptionGroup';

interface ClayTypeFilterProps {
  collections: Collection[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}

export default function ClayTypeFilter({ collections, selected, onSelect }: ClayTypeFilterProps) {
  const tCommon = useTranslations('common');

  return (
    <SegmentedOptionGroup
      items={[
        { label: tCommon('all'), value: '' },
        ...collections.map((item) => ({ label: item.name, value: item.name })),
      ]}
      value={selected ?? ''}
      onToggle={(value) => onSelect(value === selected ? undefined : value || undefined)}
      ariaLabel="니료 필터"
      size="xs"
      radius="full"
      tone="primary"
    />
  );
}
