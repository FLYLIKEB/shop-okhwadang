import type { FormEvent } from 'react';
import { cn } from '@/components/ui/utils';

interface AdminSearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  submitLabel?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export function AdminSearchForm({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel = '검색',
  className,
  inputClassName,
  buttonClassName,
}: AdminSearchFormProps) {
  return (
    <form onSubmit={onSubmit} className={cn('flex gap-2', className)}>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn('rounded-lg border bg-background px-3 py-2 text-sm', inputClassName)}
      />
      <button
        type="submit"
        className={cn(
          'rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90',
          buttonClassName,
        )}
      >
        {submitLabel}
      </button>
    </form>
  );
}
