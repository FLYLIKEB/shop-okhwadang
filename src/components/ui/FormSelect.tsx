'use client';

import { cn } from '@/components/ui/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export default function FormSelect({
  label,
  error,
  required,
  options,
  placeholder,
  className,
  id,
  ...props
}: FormSelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none',
          'focus:ring-2 focus:ring-foreground/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive',
          !props.value && placeholder && 'text-muted-foreground',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
