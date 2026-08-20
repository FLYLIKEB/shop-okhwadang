'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/components/ui/utils';

export type FormFieldDensity = 'default' | 'compact';

export interface FormFieldControlProps {
  id: string;
  'aria-labelledby': string | undefined;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

interface FormFieldRenderProps {
  id: string;
  labelId: string | undefined;
  descriptionId: string | undefined;
  errorId: string | undefined;
  describedBy: string | undefined;
  ariaInvalid: true | undefined;
  controlProps: FormFieldControlProps;
}

interface FormFieldProps {
  id?: string;
  label?: ReactNode;
  required?: boolean;
  description?: ReactNode;
  error?: ReactNode;
  density?: FormFieldDensity;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  errorClassName?: string;
  children: (field: FormFieldRenderProps) => ReactNode;
}

const FIELD_SPACING: Record<FormFieldDensity, string> = {
  default: 'space-y-1',
  compact: 'space-y-1',
};

const LABEL_CLASS: Record<FormFieldDensity, string> = {
  default: 'typo-body-sm font-medium',
  compact: 'typo-label font-semibold text-muted-foreground',
};

const DESCRIPTION_CLASS: Record<FormFieldDensity, string> = {
  default: 'typo-label text-muted-foreground',
  compact: 'typo-label text-muted-foreground',
};

const ERROR_CLASS: Record<FormFieldDensity, string> = {
  default: 'typo-label text-destructive',
  compact: 'typo-label text-destructive',
};

export function getFormControlClassName({
  error,
  density = 'default',
  className,
}: {
  error?: ReactNode;
  density?: FormFieldDensity;
  className?: string;
}) {
  return cn(
    'w-full border outline-none disabled:cursor-not-allowed disabled:opacity-50',
    density === 'compact'
      ? 'rounded-xl px-3 py-2.5 typo-body-sm focus:ring-2 focus:ring-ring'
      : 'rounded-md px-3 py-2 typo-body-sm focus:ring-2 focus:ring-foreground/20',
    error ? 'border-destructive bg-background' : 'field-soft',
    'placeholder:text-muted-foreground',
    className,
  );
}

export default function FormField({
  id,
  label,
  required,
  description,
  error,
  density = 'default',
  className,
  labelClassName,
  descriptionClassName,
  errorClassName,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const labelId = label ? `${fieldId}-label` : undefined;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  const ariaInvalid = error ? true : undefined;

  return (
    <div className={cn(FIELD_SPACING[density], className)}>
      {label && (
        <div className="flex items-baseline gap-1">
          <label id={labelId} htmlFor={fieldId} className={cn('block', LABEL_CLASS[density], labelClassName)}>
            {label}
          </label>
          {required && <span className="text-destructive" aria-hidden="true">*</span>}
        </div>
      )}
      {children({
        id: fieldId,
        labelId,
        descriptionId,
        errorId,
        describedBy,
        ariaInvalid,
        controlProps: {
          id: fieldId,
          'aria-labelledby': labelId,
          'aria-describedby': describedBy,
          'aria-invalid': ariaInvalid,
        },
      })}
      {description && (
        <p id={descriptionId} className={cn(DESCRIPTION_CLASS[density], descriptionClassName)}>
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className={cn(ERROR_CLASS[density], errorClassName)}>
          {error}
        </p>
      )}
    </div>
  );
}
