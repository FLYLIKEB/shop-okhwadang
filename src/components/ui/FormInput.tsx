'use client';

import { cn } from '@/components/ui/utils';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export default function FormInput({
  label,
  error,
  required,
  className,
  id,
  ...props
}: FormInputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none',
          'focus:ring-2 focus:ring-foreground/20',
          'placeholder:text-muted-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
