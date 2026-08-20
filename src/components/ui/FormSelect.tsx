'use client';

import FormField, { getFormControlClassName, type FormFieldDensity } from '@/components/ui/FormField';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  description?: string;
  density?: FormFieldDensity;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export default function FormSelect({
  label,
  error,
  description,
  density = 'default',
  required,
  options,
  placeholder,
  className,
  id,
  ...props
}: FormSelectProps) {
  return (
    <FormField id={id} label={label} required={required} description={description} error={error} density={density}>
      {({ controlProps }) => (
        <select
          {...controlProps}
          {...props}
          required={required}
          className={getFormControlClassName({
            error,
            density,
            className: [!props.value && placeholder && 'text-muted-foreground', className].filter(Boolean).join(' '),
          })}
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
      )}
    </FormField>
  );
}
