import type { ReactNode, ChangeEvent } from 'react';
import FormField, { getFormControlClassName } from '@/components/ui/FormField';

const ADMIN_INPUT_CLASS = 'rounded-lg focus:ring-primary';

interface BaseFieldProps {
  label: string;
  required?: boolean;
  error?: ReactNode;
  description?: ReactNode;
}

interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'number';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
}

export function TextField({
  label,
  required,
  error,
  description,
  type = 'text',
  value,
  onChange,
  placeholder,
  min,
}: TextFieldProps) {
  return (
    <FormField label={label} required={required} error={error} description={description}>
      {({ controlProps }) => (
        <input
          {...controlProps}
          type={type}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          min={min}
          className={getFormControlClassName({ error, className: ADMIN_INPUT_CLASS })}
        />
      )}
    </FormField>
  );
}

interface TextAreaFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextAreaField({
  label,
  required,
  error,
  description,
  value,
  onChange,
  placeholder,
  rows = 3,
}: TextAreaFieldProps) {
  return (
    <FormField label={label} required={required} error={error} description={description}>
      {({ controlProps }) => (
        <textarea
          {...controlProps}
          value={value}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={getFormControlClassName({ error, className: ADMIN_INPUT_CLASS })}
        />
      )}
    </FormField>
  );
}

interface SelectFieldProps<T extends string> extends BaseFieldProps {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}

export function SelectField<T extends string>({
  label,
  required,
  error,
  description,
  value,
  onChange,
  options,
}: SelectFieldProps<T>) {
  return (
    <FormField label={label} required={required} error={error} description={description}>
      {({ controlProps }) => (
        <select
          {...controlProps}
          value={value}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T)}
          required={required}
          className={getFormControlClassName({ error, className: ADMIN_INPUT_CLASS })}
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

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 typo-body-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}
