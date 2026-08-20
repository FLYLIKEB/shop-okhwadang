'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/components/ui/utils';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <span className={cn('relative inline-flex h-7 w-7 shrink-0', className)}>
      <input ref={ref} {...props} type="checkbox" className="peer sr-only" />
      <span
        aria-hidden="true"
        className="checkout-toss-check pointer-events-none flex h-full w-full items-center justify-center rounded-full border border-soft bg-background text-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    </span>
  ),
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
