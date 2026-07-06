'use client';

import { useTranslations } from 'next-intl';
import SegmentedOptionGroup from '@/components/shared/ui/SegmentedOptionGroup';
import type { AttributeFilterOption } from '@/lib/attributeFilterOptions';

interface ClayTypeFilterProps {
  options: AttributeFilterOption[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}

export default function ClayTypeFilter({ options, selected, onSelect }: ClayTypeFilterProps) {
  const tCommon = useTranslations('common');
  const tFilters = useTranslations('filters');

  return (
    <SegmentedOptionGroup
      items={[
        { label: tCommon('all'), value: '' },
        ...options.map((item) => ({
          label: item.label,
          value: item.value,
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
