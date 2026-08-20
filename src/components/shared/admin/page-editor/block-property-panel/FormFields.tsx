'use client';

import { cn } from '@/components/ui/utils';
import FormField, { getFormControlClassName } from '@/components/ui/FormField';
import { localMessage } from '@/utils/localMessages';

interface StringFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  onBlur?: () => void;
}

export function StringField({ label, value, onChange, placeholder, multiline, onBlur }: StringFieldProps) {
  return (
    <FormField label={label} density="compact">
      {({ controlProps }) => multiline ? (
        <textarea
          {...controlProps}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={4}
          className={getFormControlClassName({ density: 'compact' })}
        />
      ) : (
        <input
          {...controlProps}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={getFormControlClassName({ density: 'compact' })}
        />
      )}
    </FormField>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

export function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <FormField label={label} density="compact">
      {({ controlProps }) => (
        <input
          {...controlProps}
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={1}
          className={getFormControlClassName({ density: 'compact' })}
        />
      )}
    </FormField>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  hint?: string;
}

export function SelectField({ label, value, options, onChange, hint }: SelectFieldProps) {
  const selectedHint = hint ?? options.find((o) => o.value === value)?.hint;
  return (
    <FormField label={label} description={selectedHint} density="compact">
      {({ controlProps }) => (
        <select
          {...controlProps}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={getFormControlClassName({ density: 'compact' })}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}

interface RadioFieldProps {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

export function RadioField({ label, value, options, onChange }: RadioFieldProps) {
  const resolvedLabel = label ?? localMessage('admin.pageEditor.productSelectionMode');

  return (
    <div>
      <div className="mb-1.5 typo-label text-muted-foreground">{resolvedLabel}</div>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={(e) => { e.preventDefault(); onChange(opt.value); }}
            className={cn(
              'flex items-center gap-2 typo-label cursor-pointer rounded px-3 py-1.5 transition-colors border',
              value === opt.value
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 font-medium text-[var(--color-primary)]'
                : 'border-border hover:border-[var(--color-primary)]/50 hover:bg-muted/50',
            )}
          >
            <span
              className={cn(
                'h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
                value === opt.value ? 'border-[var(--color-primary)]' : 'border-muted-foreground',
              )}
            >
              {value === opt.value && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              )}
            </span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 블록 content 필드 업데이트 헬퍼. 각 block form 에서 반복되는
 * `(key, value) => onChange({ ...content, [key]: value })` 패턴을 제거한다.
 */
export function createContentUpdater(
  content: Record<string, unknown>,
  onChange: (c: Record<string, unknown>) => void,
) {
  return (key: string, value: unknown) => onChange({ ...content, [key]: value });
}
