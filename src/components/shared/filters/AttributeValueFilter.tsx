'use client';

import { useTranslations } from 'next-intl';
import SegmentedOptionGroup from '@/components/shared/ui/SegmentedOptionGroup';
import type { AttributeFilterOption } from '@/lib/attributeFilterOptions';

interface AttributeValueFilterProps {
  code: string;
  options: AttributeFilterOption[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}

function formatLabel(option: AttributeFilterOption): string {
  return option.productCount > 0 ? `${option.label} (${option.productCount})` : `${option.label} (0)`;
}

export default function AttributeValueFilter({ code, options, selected, onSelect }: AttributeValueFilterProps) {
  const tCommon = useTranslations('common');

  return (
    <SegmentedOptionGroup
      items={[
        { label: tCommon('all'), value: '' },
        ...options.map((item) => ({
          label: formatLabel(item),
          value: item.value,
        })),
      ]}
      value={selected ?? ''}
      onToggle={(value) => onSelect(value === selected ? undefined : value || undefined)}
      ariaLabel={code}
      size="xs"
      radius="full"
      tone="primary"
    />
  );
}
