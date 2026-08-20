'use client';

import FormField, { getFormControlClassName, type FormFieldDensity } from '@/components/ui/FormField';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
  density?: FormFieldDensity;
  required?: boolean;
}

export default function FormInput({
  label,
  error,
  description,
  density = 'default',
  required,
  className,
  id,
  ...props
}: FormInputProps) {
  return (
    <FormField id={id} label={label} required={required} description={description} error={error} density={density}>
      {({ controlProps }) => (
        <input
          {...controlProps}
          {...props}
          required={required}
          className={getFormControlClassName({ error, density, className })}
        />
      )}
    </FormField>
  );
}
