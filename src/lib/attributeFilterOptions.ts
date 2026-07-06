import type { AttributeValueOption } from '@/lib/api';

export interface AttributeFilterOption {
  value: string;
  label: string;
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
      byValue.set(value, { value, label: displayValue || value });
    }
  }
  return Array.from(byValue.values());
}
