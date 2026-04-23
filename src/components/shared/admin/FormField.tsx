import type { ReactNode, ChangeEvent } from 'react';

const INPUT_CLASS =
  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

interface BaseFieldProps {
  label: string;
  required?: boolean;
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
  type = 'text',
  value,
  onChange,
  placeholder,
  min,
}: TextFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        className={INPUT_CLASS}
      />
    </div>
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
  value,
  onChange,
  placeholder,
  rows = 3,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required ? ' *' : ''}
      </label>
      <textarea
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={INPUT_CLASS}
      />
    </div>
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
  value,
  onChange,
  options,
}: SelectFieldProps<T>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required ? ' *' : ''}
      </label>
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T)}
        className={INPUT_CLASS}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
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
    <label className="flex cursor-pointer items-center gap-2 text-sm">
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
