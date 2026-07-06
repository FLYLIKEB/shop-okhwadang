import type { AttributeValueOption } from '@/lib/api';

export interface AttributeFilterOption {
  value: string;
  label: string;
  productCount: number;
}

export interface AttributeFilterGroup {
  code: string;
  label: string;
  options: AttributeFilterOption[];
}

export function toAttributeFilterOptions(
  values: Array<string | AttributeValueOption>,
): AttributeFilterOption[] {
  const byValue = new Map<string, AttributeFilterOption>();
  for (const item of values) {
    const value = (typeof item === 'string' ? item : item.value).trim();
    if (!value) continue;
    const displayValue = typeof item === 'string' ? null : item.displayValue?.trim() || null;
    const existing = byValue.get(value);
    if (!existing || existing.label === existing.value) {
      byValue.set(value, { value, label: displayValue || value, productCount: typeof item === 'string' ? 0 : item.productCount ?? 0 });
    }
  }
  return Array.from(byValue.values());
}
